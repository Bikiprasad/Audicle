import * as Mp4Muxer from "mp4-muxer";

type VideoConfig = {
    codec: string;
    width: number;
    height: number;
    bitrate: number;
    framerate: number;
    label: string;
};

// Candidate Configurations (Re-ordered for Stability)
const CONFIG_CANDIDATES: VideoConfig[] = [
    {
        label: "720p Main (AVC Level 3.1) - Stable HD",
        codec: 'avc1.4d001f',
        width: 1280,
        height: 720,
        bitrate: 2_500_000,
        framerate: 30
    },
    {
        label: "720p Baseline (AVC Level 3.1) - Universal",
        codec: 'avc1.42001f',
        width: 1280,
        height: 720,
        bitrate: 2_000_000,
        framerate: 30
    },
    {
        label: "1080p High (AVC Level 4.2) - High Quality",
        codec: 'avc1.4d002a',
        width: 1920,
        height: 1080,
        bitrate: 6_000_000,
        framerate: 30
    }
];

export class VideoExporter {
    private canvas: OffscreenCanvas;
    private ctx: OffscreenCanvasRenderingContext2D;
    private width = 1280;
    private height = 720;

    constructor() {
        this.canvas = new OffscreenCanvas(this.width, this.height);
        this.ctx = this.canvas.getContext("2d", { alpha: false }) as OffscreenCanvasRenderingContext2D;
    }

    private async findSupportedConfig(quality: '720p' | '1080p'): Promise<VideoConfig> {
        const targetWidth = quality === '1080p' ? 1920 : 1280;

        // Filter candidates based on preference first
        const sortedCandidates = CONFIG_CANDIDATES.sort((a, b) => {
            if (a.width === targetWidth && b.width !== targetWidth) return -1;
            if (b.width === targetWidth && a.width !== targetWidth) return 1;
            return 0;
        });

        for (const config of sortedCandidates) {
            try {
                const support = await VideoEncoder.isConfigSupported({
                    codec: config.codec,
                    width: config.width,
                    height: config.height,
                    bitrate: config.bitrate,
                    framerate: config.framerate
                });
                if (support.supported) {
                    console.log(`[VideoExporter] Selected Config: ${config.label}`);
                    return config;
                }
            } catch (e) {
                console.warn(`[VideoExporter] Config check failed for ${config.label}:`, e);
            }
        }
        throw new Error("No supported H.264 video configuration found on this browser.");
    }

    async export(
        audioUrl: string,
        text: string,
        handle: string,
        authorName: string,
        avatarUrl: string | undefined,
        quality: '720p' | '1080p',
        onProgress: (percent: number) => void,
        fileHandle: FileSystemFileHandle
    ): Promise<void> {
        console.log("[VideoExporter] Starting Export Process...", quality);

        // 1. Select Configuration
        const config = await this.findSupportedConfig(quality);
        this.width = config.width;
        this.height = config.height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // 2. Load Assets (Audio + Avatar)
        const audioContext = new AudioContext();
        const [audioResponse, avatarBitmap] = await Promise.all([
            fetch(audioUrl),
            avatarUrl ? this.loadAvatar(avatarUrl) : Promise.resolve(null)
        ]);

        const arrayBuffer = await audioResponse.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        let videoChunksCount = 0;
        let encoderError: Error | null = null;

        // 3. Setup Muxer with FileSystem Target
        const writable = await fileHandle.createWritable();

        const muxer = new Mp4Muxer.Muxer({
            target: new Mp4Muxer.FileSystemWritableFileStreamTarget(writable),
            video: {
                codec: 'avc',
                width: this.width,
                height: this.height
            },
            audio: {
                codec: 'aac',
                sampleRate: audioBuffer.sampleRate,
                numberOfChannels: audioBuffer.numberOfChannels
            },
            fastStart: false
        });

        // 4. Setup Video Encoder
        const videoEncoder = new VideoEncoder({
            output: (chunk, meta) => {
                videoChunksCount++;

                // Polyfill missing colorSpace logic
                if (meta?.decoderConfig && !meta.decoderConfig.colorSpace) {
                    const configShim = {
                        ...meta.decoderConfig,
                        colorSpace: {
                            primaries: 'bt709',
                            transfer: 'bt709',
                            matrix: 'bt709',
                            fullRange: false
                        }
                    };
                    muxer.addVideoChunk(chunk, { ...meta, decoderConfig: configShim } as any);
                } else {
                    muxer.addVideoChunk(chunk, meta);
                }
            },
            error: (e) => {
                console.error("Video Encoder Fatal Error", e);
                encoderError = e instanceof Error ? e : new Error(String(e));
            }
        });

        videoEncoder.configure(config);

        // 5. Setup Audio Encoder
        const audioEncoder = new AudioEncoder({
            output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
            error: (e) => console.error("Audio Encoder Error", e)
        });

        audioEncoder.configure({
            codec: 'mp4a.40.2', // AAC
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: audioBuffer.numberOfChannels,
            bitrate: 128_000
        });

        // 6. RENDER LOOP
        const fps = 30;
        const totalFrames = Math.ceil(audioBuffer.duration * fps);
        const samplesPerFrame = Math.floor(audioBuffer.sampleRate / fps);
        const leftChannel = audioBuffer.getChannelData(0);

        console.log(`[VideoExporter] Rendering ${totalFrames} frames...`);

        // Layout Calculations
        // Layout Calculations
        const cardWidth = this.width * 0.8; // Match drawTweetFrame (Increased to 0.8)
        const fontSize = Math.floor(this.width * 0.024); // Match reduced font size
        // Wrap width: cardWidth - padding (100 is 50*2 padding) - extra safe margin (40)
        // Using -140 ensures text never touches the right edge
        const lines = this.wrapText(this.ctx, text, cardWidth - 140, fontSize);

        // --- OPTIMIZATION: Render Static Background ONCE ---
        console.log("[VideoExporter] Pre-rendering static background...");
        const staticBackground = this.renderStaticBackground(lines, handle, authorName, avatarBitmap);
        // ----------------------------------------------------

        for (let i = 0; i < totalFrames; i++) {
            if (encoderError) break;

            // Flow Control: Prevent Backpressure
            if (videoEncoder.encodeQueueSize > 10) {
                await videoEncoder.flush();
            }

            const timestamp = (i / fps) * 1_000_000;
            const startIdx = i * samplesPerFrame;
            let sum = 0;
            for (let j = 0; j < samplesPerFrame; j++) {
                if (startIdx + j < leftChannel.length) {
                    const amp = leftChannel[startIdx + j];
                    sum += amp * amp;
                }
            }
            const rmsVal = Math.sqrt(sum / samplesPerFrame);
            const audioAmplitude = Math.min(1.0, rmsVal * 5);

            // DRAW FRAME (Optimized)
            // 1. Draw Static Layer (Instant Bitmap Blit)
            this.ctx.drawImage(staticBackground, 0, 0);

            // 2. Draw Dynamic Layer (Waveform)
            this.drawDynamicOverlay(i / fps, audioAmplitude);

            const bitmap = this.canvas.transferToImageBitmap();
            const videoFrame = new VideoFrame(bitmap, {
                timestamp: timestamp,
                duration: 1_000_000 / fps
            });

            const keyFrame = i % (fps * 2) === 0;
            videoEncoder.encode(videoFrame, { keyFrame });
            videoFrame.close();

            if (i % 30 === 0) onProgress((i / totalFrames) * 100);

            // Allow UI to breathe
            if (i % 15 === 0) await new Promise(r => setTimeout(r, 0));
        }

        console.log("[VideoExporter] Flushing Video Encoder...");
        await videoEncoder.flush();

        if (encoderError) throw new Error(`Video Encoder Failed: ${encoderError.message}`);
        if (videoChunksCount === 0) throw new Error(`Encoding produced 0 frames. Browser Codec ${config.label} failed.`);

        // 7. Audio Encoding
        console.log("[VideoExporter] Encoding Audio...");
        const chunkDuration = 1;
        const framesPerChunk = audioBuffer.sampleRate * chunkDuration;

        for (let currentSample = 0; currentSample < audioBuffer.length; currentSample += framesPerChunk) {
            const leftSamplesRemaining = audioBuffer.length - currentSample;
            const currentFrameCount = Math.min(framesPerChunk, leftSamplesRemaining);
            const audioDataValues = new Float32Array(currentFrameCount * audioBuffer.numberOfChannels);

            if (audioBuffer.numberOfChannels === 2) {
                const L = audioBuffer.getChannelData(0);
                const R = audioBuffer.getChannelData(1);
                for (let i = 0; i < currentFrameCount; i++) {
                    audioDataValues[i * 2] = L[currentSample + i];
                    audioDataValues[i * 2 + 1] = R[currentSample + i];
                }
            } else {
                const L = audioBuffer.getChannelData(0);
                for (let i = 0; i < currentFrameCount; i++) {
                    audioDataValues[i] = L[currentSample + i];
                }
            }

            const audioData = new AudioData({
                format: 'f32',
                sampleRate: audioBuffer.sampleRate,
                numberOfFrames: currentFrameCount,
                numberOfChannels: audioBuffer.numberOfChannels,
                timestamp: (currentSample / audioBuffer.sampleRate) * 1_000_000,
                data: audioDataValues
            });
            audioEncoder.encode(audioData);
            audioData.close();

            if (currentSample % (framesPerChunk * 5) === 0) await new Promise(r => setTimeout(r, 0));
        }

        await writable.close();

        // Cleanup Optimization
        staticBackground.close();

        console.log("[VideoExporter] Export Complete!");
    }

    private async loadAvatar(url: string): Promise<ImageBitmap | null> {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return await createImageBitmap(blob);
        } catch (e) {
            console.warn("Failed to load avatar", e);
            return null;
        }
    }

    private renderStaticBackground(
        lines: string[],
        handle: string,
        authorName: string,
        avatar: ImageBitmap | null
    ): ImageBitmap {
        const { ctx, width, height } = this;

        // Clear (sanity check, though we overwrite)
        ctx.clearRect(0, 0, width, height);

        // 1. Background Gradient (Dark Teal/Emerald - Reference Style)
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#0f172a'); // Slate 900
        gradient.addColorStop(0.5, '#064e3b'); // Emerald 900
        gradient.addColorStop(1, '#020617'); // Slate 950
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // 2. Card Dimensions
        const cardWidth = width * 0.8;
        const tweetFontSize = Math.floor(width * 0.024);
        const lineHeight = Math.floor(tweetFontSize * 1.6);

        const cardHeight = height * 0.6;
        const cardX = (width - cardWidth) / 2;
        const cardY = (height - cardHeight) / 2 - 20;

        // Shadow (Glowy)
        ctx.shadowColor = "rgba(16, 185, 129, 0.15)"; // Emerald Glow
        ctx.shadowBlur = 80;
        ctx.shadowOffsetY = 20;

        // Card Body (Transparent/Glassy)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // 60% Opacity
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        this.roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 32);
        ctx.fill();
        ctx.stroke();
        ctx.shadowColor = "transparent";

        // 3. Header
        const padding = 50;
        const headerY = cardY + padding;
        const headerX = cardX + padding;

        // Avatar
        const avatarSize = 64;
        const avatarRadius = avatarSize / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(headerX + avatarRadius, headerY + avatarRadius, avatarRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (avatar) {
            ctx.drawImage(avatar, headerX, headerY, avatarSize, avatarSize);
        } else {
            ctx.fillStyle = '#10b981'; // Emerald
            ctx.fillRect(headerX, headerY, avatarSize, avatarSize);
        }
        ctx.restore();

        // Name & Handle
        const headerTextX = headerX + avatarSize + 20;

        // Name
        ctx.font = `bold ${Math.floor(width * 0.02)}px Inter, 'Segoe UI', system-ui, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(authorName, headerTextX, headerY + 5);

        // Handle
        ctx.font = `normal ${Math.floor(width * 0.016)}px Inter, sans-serif`;
        ctx.fillStyle = '#94a3b8'; // Slate 400
        ctx.fillText(`${handle.startsWith('@') ? '' : '@'}${handle}`, headerTextX, headerY + 38);

        // X Logo
        ctx.font = `bold ${Math.floor(width * 0.02)}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillText("𝕏", cardX + cardWidth - padding - 20, headerY + 10);

        // 4. Content Text
        ctx.font = `italic 400 ${tweetFontSize}px 'Georgia', serif`;
        ctx.fillStyle = '#f1f5f9'; // Slate 100
        const textY = headerY + 110;

        const maxLines = 4;
        let displayLines = [...lines];

        if (displayLines.length > maxLines) {
            displayLines = displayLines.slice(0, maxLines);
            const lastLine = displayLines[maxLines - 1];
            displayLines[maxLines - 1] = lastLine.endsWith('...') ? lastLine : lastLine + "...";
        }

        // Add Quotes
        if (displayLines.length > 0) {
            displayLines[0] = '"' + displayLines[0];
            displayLines[displayLines.length - 1] = displayLines[displayLines.length - 1] + '"';
        }

        displayLines.forEach((line, i) => {
            ctx.fillText(line, headerX, textY + (i * lineHeight));
        });

        // 5. Footer Branding
        const footerY = height - 45;
        ctx.textAlign = 'center';

        // "Listen on"
        ctx.font = `300 ${Math.floor(width * 0.012)}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        const prefix = "Listen on  ";
        const prefixWidth = ctx.measureText(prefix).width;

        // "Audicle"
        ctx.font = `600 ${Math.floor(width * 0.013)}px Inter, sans-serif`;
        const brand = "AUDICLE";
        const brandWidth = ctx.measureText(brand).width;

        const totalFooterWidth = prefixWidth + brandWidth;
        const startX = (width - totalFooterWidth) / 2;

        ctx.font = `300 ${Math.floor(width * 0.012)}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'left';
        ctx.fillText(prefix, startX, footerY);

        ctx.font = `700 ${Math.floor(width * 0.013)}px Inter, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(brand, startX + prefixWidth, footerY);

        // Capture Snapshot as ImageBitmap
        return this.canvas.transferToImageBitmap();
    }

    private drawDynamicOverlay(currentTime: number, energeticAmplitude: number) {
        const { ctx, width, height } = this;

        // 6. Waveform (Bottom - Outside Card)
        const waveY = height - 100;
        const waveHeight = 80;
        const numBars = 50;
        const spacing = 10;
        const totalWaveWidth = numBars * spacing;
        const waveX = (width - totalWaveWidth) / 2;

        for (let i = 0; i < numBars; i++) {
            const distanceFromCenter = Math.abs(i - numBars / 2) / (numBars / 2);
            const shapeFactor = 1 - distanceFromCenter;
            const variance = Math.sin((currentTime * 8) + i) * 0.3;
            let h = energeticAmplitude * waveHeight * shapeFactor * (0.8 + variance);

            const activeH = Math.max(6, h);
            const x = waveX + (i * spacing);
            const y = waveY;

            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#ffffff';
            this.roundRect(ctx, x, y - activeH / 2, 6, activeH, 3);
            ctx.globalAlpha = 1.0;
            ctx.fill();
        }
    }

    private wrapText(ctx: OffscreenCanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number): string[] {
        ctx.font = `normal ${fontSize}px Inter, sans-serif`;
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    private roundRect(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    private formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
}
