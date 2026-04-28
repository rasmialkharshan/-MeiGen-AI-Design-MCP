/**
 * Misbar RSS Feed Collector
 * Fetches articles from Arabic and Western news sources
 */

import Parser from 'rss-parser'
import { randomUUID } from 'crypto'
import type { RawArticle, MediaCamp, ArticleLanguage } from '../../misbar/types.js'
import { ARABIC_SOURCES, WESTERN_SOURCES, THINK_TANK_SOURCES, type NewsSource } from './sources.js'

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Misbar-Intelligence/3.0 (media analysis bot)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  },
})

export interface CollectionResult {
  articles: RawArticle[]
  sources_attempted: number
  sources_succeeded: number
  errors: string[]
}

async function fetchFromSource(source: NewsSource, limit = 10): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(source.url)
    const items = (feed.items ?? []).slice(0, limit)

    return items
      .filter(item => item.title && (item.contentSnippet || item.content || item.summary))
      .map(item => ({
        id: randomUUID(),
        url: item.link ?? item.guid ?? '',
        title: item.title ?? '',
        body: item.contentSnippet ?? item.content ?? item.summary ?? '',
        source: source.name,
        source_camp: source.camp as MediaCamp,
        language: source.language as ArticleLanguage,
        published_at: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
        author: item.creator ?? item.author ?? undefined,
        tags: item.categories ?? undefined,
      }))
  } catch {
    return []
  }
}

async function collectFromGroup(
  sources: NewsSource[],
  limit: number,
  onProgress?: (source: string, count: number) => void
): Promise<{ articles: RawArticle[]; succeeded: number; errors: string[] }> {
  const results = await Promise.allSettled(
    sources.map(s => fetchFromSource(s, limit))
  )

  const articles: RawArticle[] = []
  const errors: string[] = []
  let succeeded = 0

  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      articles.push(...result.value)
      succeeded++
      onProgress?.(sources[i].name, result.value.length)
    } else {
      const reason = result.status === 'rejected' ? String(result.reason) : 'no articles'
      errors.push(`${sources[i].name}: ${reason}`)
    }
  })

  return { articles, succeeded, errors }
}

export async function collectArticles(
  topic: string,
  options: {
    includeArabic?: boolean
    includeWestern?: boolean
    includeThinkTanks?: boolean
    articlesPerSource?: number
    onProgress?: (source: string, count: number) => void
  } = {}
): Promise<CollectionResult> {
  const {
    includeArabic = true,
    includeWestern = true,
    includeThinkTanks = false,
    articlesPerSource = 8,
    onProgress,
  } = options

  const sourceSets: NewsSource[][] = []
  if (includeArabic) sourceSets.push(ARABIC_SOURCES)
  if (includeWestern) sourceSets.push(WESTERN_SOURCES)
  if (includeThinkTanks) sourceSets.push(THINK_TANK_SOURCES)

  const allSources = sourceSets.flat()
  const allArticles: RawArticle[] = []
  const allErrors: string[] = []
  let totalSucceeded = 0

  for (const group of sourceSets) {
    const { articles, succeeded, errors } = await collectFromGroup(group, articlesPerSource, onProgress)
    allArticles.push(...articles)
    totalSucceeded += succeeded
    allErrors.push(...errors)
  }

  // Filter by topic relevance (basic keyword matching)
  const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const relevant = allArticles.filter(article => {
    const text = `${article.title} ${article.body}`.toLowerCase()
    return topicWords.some(word => text.includes(word))
  })

  // If too few relevant articles, return all collected
  const finalArticles = relevant.length >= 5 ? relevant : allArticles

  return {
    articles: finalArticles,
    sources_attempted: allSources.length,
    sources_succeeded: totalSucceeded,
    errors: allErrors,
  }
}

export function splitBycamp(articles: RawArticle[]): {
  arabic: RawArticle[]
  western: RawArticle[]
  think_tank: RawArticle[]
} {
  return {
    arabic: articles.filter(a => a.source_camp === 'arabic'),
    western: articles.filter(a => a.source_camp === 'western'),
    think_tank: articles.filter(a => a.source_camp === 'think_tank'),
  }
}
