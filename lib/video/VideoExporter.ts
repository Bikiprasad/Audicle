import * as Mp4Muxer from "mp4-muxer";
import { getVideoStyle, type VideoStyle } from "./VideoStyles";

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
    private currentStyle: VideoStyle;

    constructor(styleId: string = 'noir-minimal') {
        this.canvas = new OffscreenCanvas(this.width, this.height);
        this.ctx = this.canvas.getContext("2d", { alpha: false }) as OffscreenCanvasRenderingContext2D;
        this.currentStyle = getVideoStyle(styleId);
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
        const cardWidth = this.width * (this.currentStyle.layout.maxWidth || 0.8);
        const fontSize = this.calculateFontSize(text, this.width);

        // Wrap width: cardWidth - padding (100 is 50*2 padding) - extra safe margin (40)
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

        console.log("[VideoExporter] Flushing Audio Encoder...");
        await audioEncoder.flush();

        console.log("[VideoExporter] Finalizing Muxer...");
        muxer.finalize();

        // Ensure stream is closed effectively
        try {
            await writable.close();
        } catch (e) {
            console.warn("Stream close warning:", e);
        }

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
        const { ctx, width, height, currentStyle } = this;
        const { background, typography, layout } = currentStyle;
        const pos = layout.positions || {
            header: { x: 0.1, y: 0.1 },
            text: { x: 0.5, y: 0.5 },
            footer: { x: 0.5, y: 0.9 }
        };

        // 1. Clear & Background
        ctx.clearRect(0, 0, width, height);
        if (background.type === 'gradient') {
            const angle = background.angle || 135;
            const radians = (angle * Math.PI) / 180;
            const x1 = width / 2 - (Math.cos(radians) * width) / 2;
            const y1 = height / 2 - (Math.sin(radians) * height) / 2;
            const x2 = width / 2 + (Math.cos(radians) * width) / 2;
            const y2 = height / 2 + (Math.sin(radians) * height) / 2;
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            background.colors.forEach((color, i) => gradient.addColorStop(i / (background.colors.length - 1), color));
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = background.colors[0];
        }
        ctx.fillRect(0, 0, width, height);

        // 2. Patterns
        if (background.type === 'pattern' || background.pattern) {
            this.renderBackgroundPattern(ctx, background);
        }

        // 3. Main Text Calculation
        const fontSize = this.calculateFontSize(lines.join(' '), width);

        const lineHeight = fontSize * (typography.lineHeight || 1.5);
        let displayLines = [...lines];
        if (displayLines.length > 5) {
            displayLines = displayLines.slice(0, 5);
            displayLines[4] = displayLines[4].substring(0, 50) + '...';
        }
        const totalTextHeight = displayLines.length * lineHeight;
        const maxTextWidth = width * (layout.maxWidth || 0.8);

        // 4. Card Rendering
        if (currentStyle.card && currentStyle.card.type !== 'none') {
            const cardW = maxTextWidth + 80;
            const cardH = totalTextHeight + 80;
            const cardX = (width * (pos.text?.x || 0.5)) - (cardW / 2);
            const cardY = (height * (pos.text?.y || 0.5)) - (cardH / 2);
            this.renderCard(ctx, cardX, cardY, cardW, cardH, currentStyle.card);
        }

        // 4b. Dashboard / HUD Elements
        if (layout.showHUD || layout.showSidebar) {
            this.renderDashboardElements(ctx, layout);
        }

        // 5. Header (Positioned)
        const headerX = width * (pos.header?.x || 0.1);
        const headerY = height * (pos.header?.y || 0.1);
        const avatarSize = 40;
        const hGap = 12;

        ctx.font = `500 ${Math.floor(width * 0.014)}px ${typography.fontFamily}, sans-serif`;
        const nameWidth = ctx.measureText(authorName).width;

        let finalAvatarX = headerX;
        let finalNameX = headerX;
        let finalNameAlign: CanvasTextAlign = 'left';

        if (layout.textAlign === 'center') {
            const totalHeaderWidth = avatarSize + hGap + nameWidth;
            finalAvatarX = headerX - totalHeaderWidth / 2 + avatarSize / 2;
            finalNameX = headerX - totalHeaderWidth / 2 + avatarSize + hGap;
            finalNameAlign = 'left';
        } else if (layout.textAlign === 'right') {
            finalAvatarX = headerX - avatarSize / 2;
            finalNameX = headerX - avatarSize - hGap;
            finalNameAlign = 'right';
        } else {
            // left
            finalAvatarX = headerX + avatarSize / 2;
            finalNameX = headerX + avatarSize + hGap;
            finalNameAlign = 'left';
        }

        if (avatar) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(finalAvatarX, headerY, avatarSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, finalAvatarX - avatarSize / 2, headerY - avatarSize / 2, avatarSize, avatarSize);
            ctx.restore();
        }

        if (typography.shadow) {
            ctx.shadowColor = typography.shadow.color;
            ctx.shadowBlur = typography.shadow.blur;
        }

        ctx.fillStyle = typography.color;
        ctx.textAlign = finalNameAlign;
        ctx.textBaseline = 'middle';
        ctx.fillText(authorName, finalNameX, headerY);
        ctx.shadowBlur = 0; // Reset

        // 6. Main Text (Positioned)
        const textX = width * (pos.text?.x || 0.5);
        const textY = height * (pos.text?.y || 0.5);

        ctx.font = `${typography.fontWeight || 500} ${fontSize}px ${typography.fontFamily}, sans-serif`;
        if ((ctx as any).letterSpacing !== undefined && typography.letterSpacing !== undefined) {
            (ctx as any).letterSpacing = `${typography.letterSpacing}px`;
        }
        ctx.fillStyle = typography.color;
        ctx.textAlign = layout.textAlign;
        ctx.textBaseline = 'middle';

        if (typography.shadow) {
            ctx.shadowColor = typography.shadow.color;
            ctx.shadowBlur = typography.shadow.blur;
        }

        const startY = textY - (totalTextHeight / 2);
        displayLines.forEach((line, i) => {
            const y = startY + (i * lineHeight) + (lineHeight / 2);
            ctx.fillText(line, textX, y); // Removed maxTextWidth to prevent distortion
        });
        ctx.shadowBlur = 0; // Reset
        if ((ctx as any).letterSpacing !== undefined) (ctx as any).letterSpacing = '0px';

        // 7. Footer (Positioned)
        const footerX = width * (pos.footer?.x || 0.5);
        const footerY = height * (pos.footer?.y || 0.9);
        ctx.font = `300 ${Math.floor(width * 0.011)}px ${typography.fontFamily}, sans-serif`;
        ctx.fillStyle = hexToRgba(typography.color, 0.5);
        ctx.textAlign = layout.textAlign;
        ctx.fillText('Listen on AUDICLE', footerX, footerY);

        return this.canvas.transferToImageBitmap();
    }

    private renderBackgroundPattern(ctx: OffscreenCanvasRenderingContext2D, config: any) {
        const { width, height } = this;
        ctx.save();
        ctx.strokeStyle = config.patternColor || 'rgba(255,255,255,0.1)';
        ctx.fillStyle = config.patternColor || 'rgba(255,255,255,0.1)';
        ctx.globalAlpha = config.patternOpacity || 0.2;

        if (config.pattern === 'dots') {
            const spacing = 40;
            for (let x = 0; x < width; x += spacing) {
                for (let y = 0; y < height; y += spacing) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (config.pattern === 'grid') {
            const spacing = 60;
            ctx.lineWidth = 1;
            for (let x = 0; x < width; x += spacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += spacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        } else if (config.pattern === 'mesh') {
            const spacing = 80;
            ctx.lineWidth = 0.5;
            for (let i = -width; i < width + height; i += spacing) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + height, height);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(i, height);
                ctx.lineTo(i + height, 0);
                ctx.stroke();
            }
        } else if (config.pattern === 'halftone') {
            const spacing = 18;
            for (let x = 0; x < width + spacing; x += spacing) {
                for (let y = 0; y < height + spacing; y += spacing) {
                    const wave = Math.sin(x * 0.005) * Math.cos(y * 0.005);
                    const wave2 = Math.sin((x + y) * 0.01);
                    const factor = (wave + wave2 + 2) / 4; // 0 to 1
                    const r = 1 + factor * 8;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (config.pattern === 'liquid') {
            const spacing = 12;
            for (let x = 0; x < width + spacing; x += spacing) {
                for (let y = 0; y < height + spacing; y += spacing) {
                    const noise = Math.sin(x * 0.01 + y * 0.01) * Math.cos(x * 0.01 - y * 0.01);
                    if (noise > 0.2) {
                        ctx.beginPath();
                        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
        ctx.restore();
    }

    private renderDashboardElements(ctx: OffscreenCanvasRenderingContext2D, layout: any) {
        const { width, height } = this;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = `700 10px Inter, sans-serif`;
        ctx.lineWidth = 1;

        if (layout.showSidebar) {
            // Right Sidebar Panel
            const sbW = width * 0.25;
            ctx.strokeRect(width - sbW + 20, 20, sbW - 40, height - 40);
            ctx.textAlign = 'right';
            ctx.fillText('ENTITY_01', width - 60, 40);

            // Grid in sidebar
            const gridY = 200;
            const gridSize = 180;
            const gridX = width - sbW + 40;
            ctx.save();
            ctx.globalAlpha = 0.05;
            for (let i = 0; i <= gridSize; i += 20) {
                ctx.beginPath(); ctx.moveTo(gridX + i, gridY); ctx.lineTo(gridX + i, gridY + gridSize); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(gridX, gridY + i); ctx.lineTo(gridX + gridSize, gridY + i); ctx.stroke();
            }
            ctx.restore();
            ctx.textAlign = 'left';
            ctx.fillText('STATE: STABLE', gridX, gridY + gridSize + 20);
        }

        if (layout.showHUD) {
            // Corners brackets
            const bSize = 30;
            const p = 40;
            // Top Left
            ctx.beginPath(); ctx.moveTo(p, p + bSize); ctx.lineTo(p, p); ctx.lineTo(p + bSize, p); ctx.stroke();
            // Bottom Right
            ctx.beginPath(); ctx.moveTo(width - p, height - p - bSize); ctx.lineTo(width - p, height - p); ctx.lineTo(width - p - bSize, height - p); ctx.stroke();

            ctx.font = `400 9px monospace`;
            ctx.textAlign = 'left';
            ctx.fillText('AUDIO_IN :: 44.1 kHz', p, height - p);
            ctx.textAlign = 'right';
            ctx.fillText('SECURE_LINK :: ESTABLISHED', width - p, p);
        }
        ctx.restore();
    }

    private renderCard(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, config: any) {
        ctx.save();
        if (config.type === 'glass') {
            ctx.fillStyle = `rgba(255, 255, 255, ${config.opacity || 0.1})`;
            this.roundRect(ctx, x, y, w, h, config.borderRadius || 20);
            ctx.fill();
            ctx.strokeStyle = config.borderColor || 'rgba(255,255,255,0.2)';
            ctx.lineWidth = config.borderWidth || 1;
            ctx.stroke();
        } else if (config.type === 'glow') {
            ctx.shadowColor = config.glowColor || '#ffffff';
            ctx.shadowBlur = config.glowIntensity || 15;
            ctx.strokeStyle = config.borderColor || '#ffffff';
            ctx.lineWidth = config.borderWidth || 2;
            this.roundRect(ctx, x, y, w, h, config.borderRadius || 20);
            ctx.stroke();
        } else if (config.type === 'solid' || config.type === 'bordered') {
            ctx.fillStyle = `rgba(255, 255, 255, ${config.opacity || 1})`;
            this.roundRect(ctx, x, y, w, h, config.borderRadius || 20);
            if (config.type === 'solid') ctx.fill();
            ctx.strokeStyle = config.borderColor || 'rgba(255,255,255,0.2)';
            ctx.lineWidth = config.borderWidth || 1;
            ctx.stroke();
        }
        ctx.restore();
    }

    private drawDynamicOverlay(currentTime: number, energeticAmplitude: number) {
        const { ctx, width, height, currentStyle } = this;
        const { waveform, layout } = currentStyle;
        const pos = layout.positions?.waveform || { x: 0.5, y: 0.85 };
        const waveX = width * pos.x;
        const waveY = height * pos.y;

        ctx.save();
        ctx.fillStyle = waveform.color;
        ctx.strokeStyle = waveform.color;

        if (waveform.type === 'bars' || waveform.type === 'mini') {
            const wWidth = waveform.type === 'mini' ? 400 : 800;
            const numBars = waveform.count || 60;
            const spacing = wWidth / numBars;
            const startX = waveX - (wWidth / 2);
            const maxHeight = waveform.type === 'mini' ? 30 : 60;

            for (let i = 0; i < numBars; i++) {
                const distFactor = 1 - Math.abs(i - numBars / 2) / (numBars / 2);
                const h = Math.max(4, energeticAmplitude * maxHeight * distFactor * (0.8 + Math.sin(currentTime * 10 + i) * 0.2));
                const x = startX + (i * spacing);
                this.roundRect(ctx, x, waveY - h / 2, spacing * 0.7, h, 2);
                ctx.fill();
            }
        } else if (waveform.type === 'circle') {
            const radius = waveform.radius || 100;
            const numPoints = 80;
            ctx.beginPath();
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const variance = 1 + (energeticAmplitude * 0.5 * Math.sin(currentTime * 15 + i));
                const r = radius * variance;
                const px = waveX + Math.cos(angle) * r;
                const py = waveY + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.lineWidth = waveform.thickness || 2;
            ctx.stroke();
        } else if (waveform.type === 'dots') {
            const numDots = waveform.count || 12;
            const spacing = 30;
            const startX = waveX - ((numDots * spacing) / 2);
            for (let i = 0; i < numDots; i++) {
                const h = energeticAmplitude * 40 * Math.sin(currentTime * 8 + i);
                ctx.beginPath();
                ctx.arc(startX + (i * spacing), waveY + h, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (waveform.type === 'wave' || waveform.type === 'line') {
            const wWidth = width;
            ctx.beginPath();
            ctx.moveTo(0, waveY);
            for (let x = 0; x < wWidth; x += 10) {
                const distFactor = Math.sin((x / wWidth) * Math.PI);
                const h = energeticAmplitude * 50 * distFactor * Math.sin(currentTime * 10 + x / 50);
                ctx.lineTo(x, waveY + h);
            }
            ctx.lineWidth = waveform.thickness || 2;
            ctx.stroke();
        }
        ctx.restore();
    }

    private wrapText(ctx: OffscreenCanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number): string[] {
        const { currentStyle } = this;
        ctx.font = `${currentStyle.typography.fontWeight || 400} ${fontSize}px ${currentStyle.typography.fontFamily}, sans-serif`;
        if ((ctx as any).letterSpacing !== undefined && currentStyle.typography.letterSpacing !== undefined) {
            (ctx as any).letterSpacing = `${currentStyle.typography.letterSpacing}px`;
        }
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

    private calculateFontSize(text: string, width: number): number {
        const totalChars = text.length;
        if (totalChars < 60) return Math.floor(width * 0.052);
        if (totalChars < 120) return Math.floor(width * 0.042);
        if (totalChars < 180) return Math.floor(width * 0.035);
        return Math.floor(width * 0.028);
    }

    private formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
}

// Helper: Convert hex color to RGBA
function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
