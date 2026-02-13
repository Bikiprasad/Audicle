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

    constructor(styleId: string = 'pure-minimalist') {
        this.canvas = new OffscreenCanvas(this.width, this.height);
        this.ctx = this.canvas.getContext("2d", { alpha: false }) as OffscreenCanvasRenderingContext2D;
        this.currentStyle = getVideoStyle(styleId);
    }

// ... (keep existing findSupportedConfig and export methods unchanged until line 306)
