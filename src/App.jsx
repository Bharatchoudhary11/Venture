import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { VideoCard } from './components/VideoCard'
import { VideoPlayerOverlay } from './components/VideoPlayerOverlay'
import { videoDataset } from './data/videos'

const categoryThemes = {
  'social-media-ai': { accent: '#f472b6', glow: 'rgba(244, 114, 182, 0.25)' },
  'ai-income': { accent: '#34d399', glow: 'rgba(52, 211, 153, 0.25)' },
  'ai-essentials': { accent: '#60a5fa', glow: 'rgba(96, 165, 250, 0.25)' },
}

function App() {
  const [overlayVideo, setOverlayVideo] = useState(null)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [isMiniPlayer, setIsMiniPlayer] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')

  const categorizedFeed = useMemo(() => {
    return videoDataset.categories.map(({ category, contents }) => ({
      ...category,
      videos: contents.map((video) => ({
        ...video,
        id: video.slug,
        categoryName: category.name,
        categorySlug: category.slug,
      })),
    }))
  }, [])
  useEffect(() => {
    const preloaders = []
    categorizedFeed.forEach((category) => {
      category.videos.forEach((video) => {
        if (!video.thumbnailUrl) return
        const img = new Image()
        img.src = video.thumbnailUrl
        preloaders.push(img)
      })
    })
    return () => {
      preloaders.splice(0, preloaders.length)
    }
  }, [categorizedFeed])

  useEffect(() => {
    document.body.style.overflow = overlayVisible && !isMiniPlayer ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [overlayVisible, isMiniPlayer])

  const handleVideoSelect = (video) => {
    setOverlayVideo(video)
    setOverlayVisible(true)
  }

  const handleOverlayClose = () => {
    setOverlayVisible(false)
    setTimeout(() => setOverlayVideo(null), 320)
  }

  const filterOptions = useMemo(() => {
    const slugToCategory = Object.fromEntries(categorizedFeed.map((category) => [category.slug, category]))
    const ordered = [
      { label: 'All', value: 'all' },
      { label: 'Social Media AI', value: 'social-media-ai' },
      { label: 'AI Income', value: 'ai-income' },
      { label: 'AI Essentials', value: 'ai-essentials' },
    ]
    return ordered
      .filter((option) => option.value === 'all' || slugToCategory[option.value])
      .map((option) => ({
        ...option,
        accent: option.value === 'all' ? '#38bdf8' : categoryThemes[option.value]?.accent,
      }))
  }, [categorizedFeed])

  const visibleFeed = activeCategory === 'all' ? categorizedFeed : categorizedFeed.filter((category) => category.slug === activeCategory)

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Home · Video Feed</p>
        <p>Browse immersive clips crafted for motion studies, UI demos, and motion graphics inspiration.</p>
        <div className="filter-row" role="tablist" aria-label="Category filters">
          {filterOptions.map((filter) => (
            <button
              key={filter.value}
              className={`filter-chip ${filter.value === activeCategory ? 'active' : ''}`}
              style={{
                '--chip-accent': filter.accent ?? '#a3a3a3',
              }}
              onClick={() => setActiveCategory(filter.value)}
              role="tab"
              aria-selected={filter.value === activeCategory}
              aria-pressed={filter.value === activeCategory}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      <div className="category-feed">
        {visibleFeed.map((category) => {
          const theme = categoryThemes[category.slug] || { accent: '#38bdf8', glow: 'rgba(56, 189, 248, 0.2)' }
          return (
            <section
              key={category.slug}
              className="category-section"
              style={{
                '--section-accent': theme.accent,
                '--section-glow': theme.glow,
              }}
            >
            <div className="section-header">
              <div className="section-title">
                {category.iconUrl && <img src={category.iconUrl} alt="" aria-hidden="true" />}
                <div>
                  <h2>{category.name}</h2>
                  <p>{category.videos.length} videos</p>
                </div>
              </div>
            </div>
            <div className="video-grid">
              {category.videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  categoryName={category.name}
                  onSelect={handleVideoSelect}
                />
              ))}
            </div>
          </section>
          )
        })}
      </div>

      <div className={`overlay-shell ${overlayVisible ? 'visible' : ''}`}>
        {overlayVideo && (
          <VideoPlayerOverlay
            video={overlayVideo}
            categories={categorizedFeed}
            onVideoSelect={handleVideoSelect}
            onClose={handleOverlayClose}
            onPipChange={setIsMiniPlayer}
          />
        )}
      </div>
    </main>
  )
}

export default App
