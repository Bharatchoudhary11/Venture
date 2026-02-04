import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { VideoCard } from './components/VideoCard'
import { VideoPlayerOverlay } from './components/VideoPlayerOverlay'
import { videoDataset } from './data/videos'

function App() {
  const [overlayVideo, setOverlayVideo] = useState(null)
  const [overlayVisible, setOverlayVisible] = useState(false)

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
    document.body.style.overflow = overlayVisible ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [overlayVisible])

  const handleVideoSelect = (video) => {
    setOverlayVideo(video)
    setOverlayVisible(true)
  }

  const handleOverlayClose = () => {
    setOverlayVisible(false)
    setTimeout(() => setOverlayVideo(null), 320)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Home · Video Feed</p>
        <h1>Curated Videos by Category</h1>
        <p>Browse immersive clips crafted for motion studies, UI demos, and motion graphics inspiration.</p>
      </header>

      <div className="category-feed">
        {categorizedFeed.map((category) => (
          <section key={category.slug} className="category-section">
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
        ))}
      </div>

      <div className={`overlay-shell ${overlayVisible ? 'visible' : ''}`}>
        {overlayVideo && (
          <VideoPlayerOverlay
            video={overlayVideo}
            categories={categorizedFeed}
            onVideoSelect={handleVideoSelect}
            onClose={handleOverlayClose}
          />
        )}
      </div>
    </main>
  )
}

export default App
