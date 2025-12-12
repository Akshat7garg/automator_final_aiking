import React, { useState } from 'react';

const VideoSection = () => {
  const [showVideo, setShowVideo] = useState(false);

  const handlePlayClick = () => {
    setShowVideo(true);
  };

  return (
    <section className="w-full flex items-center justify-center bg-[#11011E] relative px-4 sm:px-6 lg:px-8 xl:px-20 py-12 sm:py-16 lg:py-24 min-h-[60vh] sm:min-h-[70vh] lg:min-h-[80vh]">
      {/* Decorative blur effects */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#7000FF] rounded-full opacity-25 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#FF00C7] rounded-full  opacity-25 animate-pulse delay-1000"></div>
      
      {/* Video Card */}
      <div className="relative z-10 w-full max-w-[1200px] aspect-video bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[24px] overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_0_80px_rgba(15,174,150,0.15)] hover:border-[rgba(15,174,150,0.2)] hover:scale-[1.02] group">
        {/* Video wrapper with enhanced styling */}
        <div className="relative w-full h-full">
          {!showVideo ? (
            <>
              {/* Play button overlay */}
              <div className="absolute inset-0 z-20 flex items-center justify-center opacity-100 scale-110 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 ">
                <button
                  onClick={handlePlayClick}
                  className="w-16 h-16 sm:w-20 sm:h-20 bg-[#0FAE96] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-[0_0_30px_rgba(15,174,150,0.4)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96]"
                  aria-label="Play video"
                >
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
              
              {/* Corner accent indicators */}
              <div className="absolute top-4 left-4 w-3 h-3 bg-[#0FAE96] rounded-full opacity-60 animate-pulse"></div>
              <div className="absolute top-4 right-4 w-2 h-2 bg-[#0FAE96] rounded-full opacity-40"></div>
              <div className="absolute bottom-4 left-4 w-2 h-2 bg-[#0FAE96] rounded-full opacity-40"></div>
              <div className="absolute bottom-4 right-4 w-3 h-3 bg-[#0FAE96] rounded-full opacity-60 animate-pulse delay-500"></div>
              
              <img
                className="w-full h-full object-cover relative z-10 cursor-pointer"
                src="/images/autoapply.png"
                alt="Demo Video Thumbnail"
                onClick={handlePlayClick}
              />
            </>
          ) : (
            <iframe
              className="w-full h-full relative z-10"
              src="https://www.youtube.com/embed/wH5qO0f-kKA?rel=0&autoplay=1"
              title="Demo Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
        
        {/* Bottom gradient border accent */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#0FAE96] to-transparent opacity-60"></div>
      </div>
    </section>
  );
};

export default VideoSection;