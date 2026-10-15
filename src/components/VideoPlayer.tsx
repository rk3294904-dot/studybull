import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MediaPlayer } from 'dashjs';
import type { MediaPlayerClass } from 'dashjs';
import type { RequestInterceptor } from '@svta/cml-request';
import type { VideoApiResponse } from '@/types';
import { fetchVideo } from '@/services/api';
import { SlidesDrawer } from '@/components/SlidesDrawer';

interface Props {
  batchId: string;
  lectureId: string;
  subjectId: string;
  title: string;
  onBack: () => void;
}

interface QualityLevel {
  index: number;
  height?: number;
  bitrate?: number;
}

interface QualityPlayer extends MediaPlayerClass {
  getBitrateInfoListFor: (type: string) => QualityLevel[];
  setQualityFor: (type: string, qualityIndex: number) => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function hexToBase64Url(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function VideoPlayer({ batchId, lectureId, subjectId, title, onBack }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<MediaPlayerClass | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSlides, setShowSlides] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState(-1);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (playing) {
      hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    let cancelled = false;

    async function loadVideo() {
      try {
        const response: VideoApiResponse = await fetchVideo(batchId, lectureId, subjectId);
        if (cancelled) return;
        if (!response.success) throw new Error('This lecture is not available right now.');

        const streamUrl = response.url || response.dashurl;
        if (!streamUrl) throw new Error('No video stream is available for this lecture.');
        const video = videoRef.current;
        if (!video) return;

        const player = MediaPlayer().create();
        const qualityPlayer = player as QualityPlayer;
        playerRef.current = player;
        const keyEntries = Object.keys(response.keys ?? {});
        if (keyEntries.length > 0) {
          const clearkeys: Record<string, string> = {};
          keyEntries.forEach((kid) => { clearkeys[hexToBase64Url(kid)] = hexToBase64Url(response.keys[kid]); });
          player.setProtectionData({ 'org.w3.clearkey': { clearkeys } });
        }

        const signingParams = new URL(streamUrl).search;
        if (signingParams) {
          const signingQuery = signingParams.slice(1);
          const interceptor: RequestInterceptor = (request) => {
            if (request.url && (request.url.includes('examcrushers.in') || request.url.includes('cloudfront.net'))) {
              request.url += `${request.url.includes('?') ? '&' : '?'}${signingQuery}`;
            }
            return Promise.resolve(request);
          };
          player.addRequestInterceptor(interceptor);
        }

        player.on(MediaPlayer.events.ERROR, (event) => {
          if (cancelled) return;
          const detail = event as { error?: { message?: string } | string };
          setError(typeof detail.error === 'string' ? detail.error : detail.error?.message || 'Video playback error');
          setLoading(false);
        });
        player.on(MediaPlayer.events.PLAYBACK_PLAYING, () => {
          if (cancelled) return;
          setLoading(false);
          setPlaying(true);
        });
        player.on(MediaPlayer.events.PLAYBACK_PAUSED, () => {
          if (cancelled) return;
          setPlaying(false);
          setControlsVisible(true);
        });
        player.on(MediaPlayer.events.PLAYBACK_LOADED_DATA, () => !cancelled && setLoading(false));
        player.on(MediaPlayer.events.PLAYBACK_TIME_UPDATED, () => {
          if (cancelled || !videoRef.current) return;
          setCurrentTime(videoRef.current.currentTime);
          if (videoRef.current.buffered.length > 0) setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
        });
        player.on(MediaPlayer.events.PLAYBACK_METADATA_LOADED, () => {
          if (!cancelled && videoRef.current) setDuration(videoRef.current.duration);
        });
        player.on(MediaPlayer.events.STREAM_INITIALIZED, () => {
          if (cancelled) return;
          setLoading(false);
          if (videoRef.current) setDuration(videoRef.current.duration);
          const levels = qualityPlayer.getBitrateInfoListFor('video');
          setQualityLevels(levels.map((level, index) => ({ ...level, index })).sort((a, b) => (a.height ?? 0) - (b.height ?? 0)));
        });
        player.initialize(video, streamUrl, true);
        window.setTimeout(() => !cancelled && setLoading(false), 8000);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Failed to load video');
        setLoading(false);
      }
    }

    loadVideo();
    return () => {
      cancelled = true;
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      playerRef.current?.reset();
      playerRef.current = null;
    };
  }, [batchId, lectureId, subjectId]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.body.style.overflow = '';
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setError('Tap play again to start this video.'));
    else video.pause();
    revealControls();
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || duration, video.currentTime + seconds));
    revealControls();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextVolume = Number(event.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = nextVolume;
    video.muted = nextVolume === 0;
    setVolume(nextVolume);
    setMuted(nextVolume === 0);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(event.target.value);
    if (videoRef.current) videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const changeSpeed = (nextSpeed: number) => {
    if (videoRef.current) videoRef.current.playbackRate = nextSpeed;
    setSpeed(nextSpeed);
    setShowSettings(false);
  };

  const changeQuality = (nextQuality: number) => {
    const player = playerRef.current as QualityPlayer | null;
    player?.setQualityFor('video', nextQuality);
    setQuality(nextQuality);
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void containerRef.current.requestFullscreen();
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#1d2229] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24 bg-gradient-to-b from-[#1d2229]/70 to-transparent" />
      <header className={`absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-4 py-4 transition-opacity duration-300 sm:px-7 ${controlsVisible || !playing ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <button onClick={onBack} aria-label="Back to lessons" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 transition hover:bg-white/20"><ArrowLeft className="h-5 w-5" /></button>
        <img src="/quantica-logo.png" alt="Quantica Digital" className="hidden h-9 w-9 rounded-xl ring-1 ring-white/20 sm:block" />
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">Quantica Digital</p><h1 className="truncate text-sm font-semibold sm:text-base">{title}</h1></div>
        <button onClick={() => setShowSlides(true)} aria-label="Open lecture slides" className="flex items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/20"><BookOpen className="h-4 w-4" /><span className="hidden sm:inline">Slides</span></button>
      </header>

      <main className="relative flex min-h-0 flex-1 touch-manipulation items-center justify-center" onMouseMove={revealControls} onMouseLeave={() => playing && setControlsVisible(false)} onClick={() => !loading && !error && togglePlay()}>
        <video ref={videoRef} className="h-full w-full cursor-pointer object-contain" playsInline onClick={(event) => { event.stopPropagation(); if (!loading && !error) togglePlay(); }} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.35)_100%)]" />

        {loading && <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070b12]/80"><div className="relative h-14 w-14"><div className="absolute inset-0 rounded-full border-2 border-white/15" /><div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-white border-r-white/70" /></div><p className="mt-5 text-xs font-medium uppercase tracking-[0.28em] text-white/75">Quantica Player</p></div>}
        {error && <div className="absolute inset-0 flex items-center justify-center bg-[#070b12]/90 px-5"><div className="w-full max-w-sm rounded-2xl border border-red-400/20 bg-red-950/20 p-6 text-center"><AlertCircle className="mx-auto h-10 w-10 text-red-400" /><h2 className="mt-4 font-semibold">Video unavailable</h2><p className="mt-2 text-sm leading-6 text-slate-400">{error}</p><button onClick={onBack} className="mt-5 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold transition hover:bg-sky-400">Back to lessons</button></div></div>}
        {!loading && !error && !playing && <button onClick={(event) => { event.stopPropagation(); togglePlay(); }} aria-label="Play video" className="absolute flex h-24 w-24 items-center justify-center rounded-full bg-[#303840] pl-1 shadow-2xl shadow-black/30 transition hover:scale-105 hover:bg-[#3b4650] active:scale-95 sm:h-28 sm:w-28"><Play className="h-10 w-10 fill-current text-white sm:h-12 sm:w-12" /></button>}
        {showSlides && <div onClick={(event) => event.stopPropagation()}><SlidesDrawer batchId={batchId} subjectId={subjectId} scheduleId={lectureId} onClose={() => setShowSlides(false)} onJumpTo={(seconds) => { if (videoRef.current) videoRef.current.currentTime = seconds; }} /></div>}
      </main>

      {!loading && !error && <footer className={`absolute inset-x-0 bottom-0 z-30 px-3 pb-3 transition-opacity duration-300 sm:px-7 sm:pb-6 ${controlsVisible || !playing ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto max-w-4xl px-1 py-1 sm:px-2">
          <div className="relative mb-3 flex h-4 items-center"><div className="absolute inset-x-0 h-1 rounded-full bg-white/25" /><div className="absolute left-0 h-1 rounded-full bg-white/70" style={{ width: `${bufferedPercent}%` }} /><div className="absolute left-0 h-1 rounded-full bg-[#e35b58]" style={{ width: `${progressPercent}%` }} /><input aria-label="Seek video" type="range" min={0} max={duration || 0} step={0.1} value={currentTime} onChange={handleSeek} className="relative z-10 h-4 w-full cursor-pointer appearance-none bg-transparent accent-[#e35b58]" /></div>
          <div className="flex items-center gap-2 text-slate-200 sm:gap-3">
            <button onClick={togglePlay} aria-label={playing ? 'Pause video' : 'Play video'} className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-white/10">{playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}</button>
            <button onClick={() => skip(-10)} aria-label="Rewind 10 seconds" className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><RotateCcw className="h-4 w-4" /></button>
            <button onClick={() => skip(10)} aria-label="Forward 10 seconds" className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><RotateCw className="h-4 w-4" /></button>
            <button onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">{muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
            <input aria-label="Volume" type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={handleVolumeChange} className="hidden w-16 accent-sky-400 sm:block" />
            <span className="whitespace-nowrap text-xs tabular-nums text-slate-300">{formatTime(currentTime)} <span className="text-slate-600">/</span> <span className="text-slate-500">{formatTime(duration)}</span></span>
            <div className="flex-1" />
            <div className="relative">
              <button onClick={() => setShowSettings((visible) => !visible)} aria-label="Playback settings" className="flex items-center gap-1 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><Settings className="h-4 w-4" /><ChevronDown className="hidden h-3 w-3 sm:block" /></button>
              {showSettings && <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl border border-white/10 bg-[#252c34] p-2 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Speed</p>
                {SPEEDS.map((value) => <button key={value} onClick={() => changeSpeed(value)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-white/80 transition hover:bg-white/10">{value}x {speed === value && <Check className="h-3.5 w-3.5 text-[#e35b58]" />}</button>)}
                {qualityLevels.length > 0 && <><div className="my-2 border-t border-white/10" /><p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Quality</p><button onClick={() => changeQuality(-1)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-white/80 transition hover:bg-white/10">Auto {quality === -1 && <Check className="h-3.5 w-3.5 text-[#e35b58]" />}</button>{qualityLevels.map((level) => <button key={level.index} onClick={() => changeQuality(level.index)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-white/80 transition hover:bg-white/10">{level.height ? `${level.height}p` : `${Math.round((level.bitrate ?? 0) / 1000)} kbps`} {quality === level.index && <Check className="h-3.5 w-3.5 text-[#e35b58]" />}</button>)}</>}
              </div>}
            </div>
            <button onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">{fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}</button>
          </div>
          <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">Quantica Player</div>
        </div>
      </footer>}
    </div>
  );
}
