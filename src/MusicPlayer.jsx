import React, { useState, useEffect, useRef } from 'react';
import { Music, Volume2, VolumeX, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTrack, setCurrentTrack] = useState(0);
  const audioRef = useRef(null);

  // Add your own music files here (hosted somewhere or local files)
  const tracks = [
	  {
		title: "Reawaken",
		artist: "LiSA",
		url: "/music/reawaken.mp3", // Path relative to public folder
		artwork: "/images/reawaken.jpg"
	  },
	  {
		title: "Solo Lofi",
		artist: "anfi",
		url: "/music/soloLofi.mp3", // Path relative to public folder
		artwork: "/images/soloLofi.jpg"
	  },
	  {
		title: "I Aint Worried",
		artist: "One Republic",
		url: "/music/iAintWorried.mp3", // Path relative to public folder
		artwork: "/images/iAintWorried.jpg"
	  }
	  // Add more tracks...
  ];
  

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (isPlaying) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  const handleTimeUpdate = () => {
    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(progress);
  };

  const handleSeek = (e) => {
    const rect = e.target.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pos * audioRef.current.duration;
  };

  const handleTrackEnd = () => {
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-gray-700 w-80">
      <audio 
        ref={audioRef}
        src={tracks[currentTrack].url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleTrackEnd}
      />
      
      <div className="flex items-center gap-3 mb-4">
        <img 
          src={tracks[currentTrack].artwork} 
          alt="Album art" 
          className="w-12 h-12 rounded-lg object-cover"
        />
        <div>
          <p className="font-medium text-white">{tracks[currentTrack].title}</p>
          <p className="text-sm text-gray-400">{tracks[currentTrack].artist}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative h-2 bg-gray-700 rounded-full cursor-pointer" onClick={handleSeek}>
          <div 
            className="absolute h-full bg-cyan-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setVolume(prev => prev === 0 ? 1 : 0)}
              className="text-gray-300 hover:text-white"
            >
              {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-cyan-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentTrack(prev => 
                prev === 0 ? tracks.length - 1 : prev - 1
              )}
              className="text-gray-300 hover:text-white"
            >
              <SkipBack size={20} />
            </button>
            
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-cyan-600 rounded-full hover:bg-cyan-500 text-white"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button 
              onClick={() => setCurrentTrack(prev => (prev + 1) % tracks.length)}
              className="text-gray-300 hover:text-white"
            >
              <SkipForward size={20} />
            </button>
          </div>
        </div>

        <select
          value={currentTrack}
          onChange={(e) => setCurrentTrack(parseInt(e.target.value))}
          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
        >
          {tracks.map((track, index) => (
            <option key={index} value={index}>
              {track.title} - {track.artist}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default MusicPlayer;