import PropTypes from 'prop-types'

export function VideoCard({ video, categoryName, onSelect }) {
  return (
    <button className="video-card" onClick={() => onSelect(video)}>
      <div className="thumb-wrapper">
        <img src={video.thumbnailUrl} alt={video.title} loading="lazy" />
        <span className="duration-chip">{video.duration ?? '—:—'}</span>
      </div>
      <div className="video-card-body">
        <span className="category-chip">{categoryName}</span>
        <h3>{video.title}</h3>
      </div>
    </button>
  )
}

VideoCard.propTypes = {
  video: PropTypes.shape({
    title: PropTypes.string.isRequired,
    thumbnailUrl: PropTypes.string.isRequired,
    duration: PropTypes.string,
  }).isRequired,
  categoryName: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
}
