/**
 * Misbar Intelligence System — News Source Registry
 * 20+ Arabic, Western, and Think Tank RSS sources
 */

export interface NewsSource {
  name: string
  url: string
  camp: 'arabic' | 'western' | 'think_tank' | 'global'
  language: 'ar' | 'en' | 'fr' | 'other'
  bias: 'left' | 'right' | 'center' | 'state' | 'independent'
  reliability: number // 0-100
  specializations: string[]
}

export const ARABIC_SOURCES: NewsSource[] = [
  {
    name: 'Al Jazeera Arabic',
    url: 'https://www.aljazeera.net/ajstream/xml/article.xml',
    camp: 'arabic',
    language: 'ar',
    bias: 'state',
    reliability: 75,
    specializations: ['middle east', 'politics', 'conflict'],
  },
  {
    name: 'Al Arabiya',
    url: 'https://www.alarabiya.net/tools/rss',
    camp: 'arabic',
    language: 'ar',
    bias: 'state',
    reliability: 70,
    specializations: ['gulf', 'economy', 'saudi arabia'],
  },
  {
    name: 'BBC Arabic',
    url: 'https://feeds.bbci.co.uk/arabic/rss.xml',
    camp: 'arabic',
    language: 'ar',
    bias: 'center',
    reliability: 85,
    specializations: ['international', 'politics', 'society'],
  },
  {
    name: 'Sky News Arabia',
    url: 'https://www.skynewsarabia.com/rss.xml',
    camp: 'arabic',
    language: 'ar',
    bias: 'center',
    reliability: 72,
    specializations: ['breaking news', 'middle east'],
  },
  {
    name: 'Al Monitor Arabic',
    url: 'https://www.al-monitor.com/rss.xml',
    camp: 'arabic',
    language: 'ar',
    bias: 'independent',
    reliability: 80,
    specializations: ['middle east policy', 'analysis'],
  },
  {
    name: 'Asharq Al-Awsat',
    url: 'https://aawsat.com/home/rss',
    camp: 'arabic',
    language: 'ar',
    bias: 'center',
    reliability: 78,
    specializations: ['pan-arab', 'politics', 'culture'],
  },
  {
    name: 'Al Quds Al Arabi',
    url: 'https://www.alquds.co.uk/feed',
    camp: 'arabic',
    language: 'ar',
    bias: 'independent',
    reliability: 73,
    specializations: ['palestine', 'pan-arab', 'diaspora'],
  },
  {
    name: 'Mada Masr',
    url: 'https://www.madamasr.com/en/feed/',
    camp: 'arabic',
    language: 'ar',
    bias: 'independent',
    reliability: 82,
    specializations: ['egypt', 'human rights', 'investigative'],
  },
]

export const WESTERN_SOURCES: NewsSource[] = [
  {
    name: 'Reuters',
    url: 'https://feeds.reuters.com/reuters/topNews',
    camp: 'western',
    language: 'en',
    bias: 'center',
    reliability: 90,
    specializations: ['breaking news', 'finance', 'international'],
  },
  {
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    camp: 'western',
    language: 'en',
    bias: 'center',
    reliability: 88,
    specializations: ['international', 'politics', 'society'],
  },
  {
    name: 'The Guardian',
    url: 'https://www.theguardian.com/world/rss',
    camp: 'western',
    language: 'en',
    bias: 'left',
    reliability: 83,
    specializations: ['human rights', 'environment', 'politics'],
  },
  {
    name: 'New York Times',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    camp: 'western',
    language: 'en',
    bias: 'left',
    reliability: 87,
    specializations: ['politics', 'culture', 'international'],
  },
  {
    name: 'AP News',
    url: 'https://feeds.apnews.com/rss/apf-topnews',
    camp: 'western',
    language: 'en',
    bias: 'center',
    reliability: 91,
    specializations: ['breaking news', 'wire service'],
  },
  {
    name: 'Al Jazeera English',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    camp: 'western',
    language: 'en',
    bias: 'center',
    reliability: 78,
    specializations: ['middle east', 'global south', 'conflict'],
  },
  {
    name: 'Foreign Policy',
    url: 'https://foreignpolicy.com/feed/',
    camp: 'western',
    language: 'en',
    bias: 'center',
    reliability: 84,
    specializations: ['geopolitics', 'diplomacy', 'analysis'],
  },
  {
    name: 'The Economist',
    url: 'https://www.economist.com/international/rss.xml',
    camp: 'western',
    language: 'en',
    bias: 'center',
    reliability: 88,
    specializations: ['economics', 'politics', 'global affairs'],
  },
  {
    name: 'Washington Post',
    url: 'https://feeds.washingtonpost.com/rss/world',
    camp: 'western',
    language: 'en',
    bias: 'left',
    reliability: 85,
    specializations: ['politics', 'national security', 'international'],
  },
  {
    name: 'France 24 English',
    url: 'https://www.france24.com/en/rss',
    camp: 'western',
    language: 'en',
    bias: 'center',
    reliability: 80,
    specializations: ['france', 'africa', 'middle east'],
  },
]

export const THINK_TANK_SOURCES: NewsSource[] = [
  {
    name: 'Brookings Institution',
    url: 'https://www.brookings.edu/feed/',
    camp: 'think_tank',
    language: 'en',
    bias: 'center',
    reliability: 87,
    specializations: ['policy analysis', 'governance', 'economy'],
  },
  {
    name: 'Carnegie Middle East',
    url: 'https://carnegie-mec.org/feed/',
    camp: 'think_tank',
    language: 'en',
    bias: 'independent',
    reliability: 85,
    specializations: ['middle east', 'arab politics', 'reform'],
  },
  {
    name: 'RAND Corporation',
    url: 'https://www.rand.org/feed.xml',
    camp: 'think_tank',
    language: 'en',
    bias: 'independent',
    reliability: 88,
    specializations: ['security', 'defense', 'policy research'],
  },
  {
    name: 'Middle East Eye',
    url: 'https://www.middleeasteye.net/rss',
    camp: 'think_tank',
    language: 'en',
    bias: 'independent',
    reliability: 74,
    specializations: ['middle east', 'investigative', 'human rights'],
  },
]

export const ALL_SOURCES = [...ARABIC_SOURCES, ...WESTERN_SOURCES, ...THINK_TANK_SOURCES]

export function getSourcesByTopic(topic: string): NewsSource[] {
  const topicLower = topic.toLowerCase()
  return ALL_SOURCES.filter(s =>
    s.specializations.some(spec =>
      topicLower.includes(spec) || spec.includes(topicLower.split(' ')[0])
    )
  )
}
