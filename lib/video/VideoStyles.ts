// Video Style Type Definitions

export interface BackgroundConfig {
    type: 'gradient' | 'solid' | 'pattern';
    colors: string[];
    angle?: number;
    pattern?: 'dots' | 'grid' | 'mesh' | 'halftone' | 'liquid';
    patternColor?: string;
    patternOpacity?: number;
}

export interface CardConfig {
    type: 'none' | 'glass' | 'solid' | 'bordered' | 'glow';
    opacity?: number;
    blur?: number;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    glowColor?: string;
    glowIntensity?: number;
}

export interface TypographyConfig {
    fontFamily: string;
    fontSize: number;
    fontWeight: number | string;
    color: string;
    style: 'normal' | 'italic';
    letterSpacing: number;
    lineHeight: number;
    shadow?: {
        color: string;
        blur: number;
    };
}

export interface WaveformConfig {
    type: 'line' | 'bars' | 'dots' | 'wave' | 'circle' | 'mini';
    position: 'bottom' | 'center' | 'top' | 'corners' | 'custom';
    color: string;
    thickness?: number;
    smoothness?: number;
    count?: number;
    radius?: number; // For circle type
    yOffset?: number; // Custom vertical position
}

export interface LayoutConfig {
    textAlign: 'left' | 'center' | 'right';
    padding: number;
    maxWidth: number;
    showHUD?: boolean;
    showSidebar?: boolean;
    // Normalized coordinates (0-1) for element center-points
    positions?: {
        header?: { x: number, y: number };
        text?: { x: number, y: number };
        footer?: { x: number, y: number };
        waveform?: { x: number, y: number };
    };
}

export interface VideoStyle {
    id: string;
    name: string;
    description: string;
    background: BackgroundConfig;
    card: CardConfig;
    typography: TypographyConfig;
    waveform: WaveformConfig;
    layout: LayoutConfig;
}

// Premium Gradient Style Definitions
export const VIDEO_STYLES: Record<string, VideoStyle> = {
    'noir-minimal': {
        id: 'noir-minimal',
        name: 'Noir Minimal',
        description: 'Vercel-inspired ultra-dark aesthetic',
        background: {
            type: 'solid',
            colors: ['#0A0A0A']
        },
        card: { type: 'none' },
        typography: {
            fontFamily: 'Inter',
            fontSize: 46,
            fontWeight: 300,
            color: '#FFFFFF',
            style: 'normal',
            letterSpacing: -1.2,
            lineHeight: 1.4
        },
        waveform: {
            type: 'mini',
            position: 'bottom',
            color: 'rgba(255, 255, 255, 0.4)',
            thickness: 2,
            count: 30
        },
        layout: {
            textAlign: 'left',
            padding: 100,
            maxWidth: 0.75,
            positions: {
                header: { x: 0.1, y: 0.12 },
                text: { x: 0.1, y: 0.45 },
                footer: { x: 0.1, y: 0.9 },
                waveform: { x: 0.1, y: 0.82 }
            }
        }
    },

    'solar-light': {
        id: 'solar-light',
        name: 'Solar Light',
        description: 'Warm cream and deep slate',
        background: {
            type: 'solid',
            colors: ['#F9F8F3']
        },
        card: {
            type: 'bordered',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.05)',
            borderRadius: 8
        },
        typography: {
            fontFamily: 'Inter',
            fontSize: 48,
            fontWeight: 500,
            color: '#1A1A1A',
            style: 'normal',
            letterSpacing: -0.5,
            lineHeight: 1.5
        },
        waveform: {
            type: 'wave',
            position: 'bottom',
            color: 'rgba(0, 0, 0, 0.1)',
            thickness: 3,
            smoothness: 0.8
        },
        layout: {
            textAlign: 'center',
            padding: 120,
            maxWidth: 0.8,
            positions: {
                header: { x: 0.5, y: 0.14 },
                text: { x: 0.5, y: 0.48 },
                footer: { x: 0.5, y: 0.92 },
                waveform: { x: 0.5, y: 0.98 }
            }
        }
    },

    'arctic-glass': {
        id: 'arctic-glass',
        name: 'Arctic Glass',
        description: 'Clean glassmorphism on soft gradient',
        background: {
            type: 'gradient',
            colors: ['#EFF6FF', '#DBEAFE', '#BFDBFE'],
            angle: 135
        },
        card: {
            type: 'glass',
            blur: 24,
            opacity: 0.12,
            borderRadius: 32,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.6)'
        },
        typography: {
            fontFamily: 'Inter',
            fontSize: 44,
            fontWeight: 600,
            color: '#1E40AF',
            style: 'normal',
            letterSpacing: -0.8,
            lineHeight: 1.3
        },
        waveform: {
            type: 'circle',
            position: 'custom',
            color: 'rgba(30, 64, 175, 0.4)',
            radius: 140,
            yOffset: 0.14
        },
        layout: {
            textAlign: 'center',
            padding: 80,
            maxWidth: 0.85,
            positions: {
                header: { x: 0.5, y: 0.14 },
                text: { x: 0.5, y: 0.5 },
                footer: { x: 0.5, y: 0.9 },
                waveform: { x: 0.5, y: 0.14 }
            }
        }
    },

    'obsidian-mesh': {
        id: 'obsidian-mesh',
        name: 'Obsidian Mesh',
        description: 'Deep indigo with subtle technical mesh',
        background: {
            type: 'pattern',
            pattern: 'mesh',
            colors: ['#020617'],
            patternColor: 'rgba(56, 189, 248, 0.12)',
            patternOpacity: 0.15
        },
        card: { type: 'none' },
        typography: {
            fontFamily: 'Inter',
            fontSize: 50,
            fontWeight: 800,
            color: '#F8FAFC',
            style: 'normal',
            letterSpacing: -2,
            lineHeight: 1.2
        },
        waveform: {
            type: 'bars',
            position: 'center',
            color: '#38BDF8',
            count: 50
        },
        layout: {
            textAlign: 'left',
            padding: 90,
            maxWidth: 0.7,
            positions: {
                header: { x: 0.1, y: 0.08 },
                text: { x: 0.1, y: 0.4 },
                footer: { x: 0.1, y: 0.95 },
                waveform: { x: 0.6, y: 0.9 }
            }
        }
    },

    'studio-carbon': {
        id: 'studio-carbon',
        name: 'Studio Carbon',
        description: 'Pro editing suite aesthetic',
        background: {
            type: 'solid',
            colors: ['#18181B']
        },
        card: {
            type: 'glow',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#3F3F46',
            glowColor: '#4ADE80',
            glowIntensity: 8
        },
        typography: {
            fontFamily: 'Inter',
            fontSize: 42,
            fontWeight: 400,
            color: '#E4E4E7',
            style: 'normal',
            letterSpacing: 0.5,
            lineHeight: 1.6
        },
        waveform: {
            type: 'mini',
            position: 'top',
            color: '#4ADE80',
            thickness: 1.5,
            count: 70
        },
        layout: {
            textAlign: 'right',
            padding: 100,
            maxWidth: 0.65,
            positions: {
                header: { x: 0.9, y: 0.12 },
                text: { x: 0.9, y: 0.5 },
                footer: { x: 0.9, y: 0.9 },
                waveform: { x: 0.5, y: 0.05 }
            }
        }
    },

    'modern-serif': {
        id: 'modern-serif',
        name: 'Modern Serif',
        description: 'High-end editorial layout',
        background: {
            type: 'pattern',
            pattern: 'dots',
            colors: ['#FFFBF7'],
            patternColor: 'rgba(0,0,0,0.05)',
            patternOpacity: 0.3
        },
        card: { type: 'none' },
        typography: {
            fontFamily: 'Inter',
            fontSize: 46,
            fontWeight: 300,
            color: '#111827',
            style: 'italic',
            letterSpacing: 0,
            lineHeight: 1.5
        },
        waveform: {
            type: 'dots',
            position: 'custom',
            color: '#111817',
            count: 8,
            yOffset: 0.8
        },
        layout: {
            textAlign: 'center',
            padding: 140,
            maxWidth: 0.75,
            positions: {
                header: { x: 0.5, y: 0.15 },
                text: { x: 0.5, y: 0.45 },
                footer: { x: 0.5, y: 0.85 },
                waveform: { x: 0.5, y: 0.75 }
            }
        }
    },

    'bento-slate': {
        id: 'bento-slate',
        name: 'Bento Slate',
        description: 'Modern grid system style',
        background: {
            type: 'pattern',
            pattern: 'grid',
            colors: ['#F1F5F9'],
            patternColor: 'rgba(0,0,0,0.03)',
            patternOpacity: 1
        },
        card: {
            type: 'solid',
            opacity: 1,
            borderRadius: 24,
            borderColor: 'rgba(0,0,0,0.05)',
            borderWidth: 1
        },
        typography: {
            fontFamily: 'Inter',
            fontSize: 44,
            fontWeight: 700,
            color: '#334155',
            style: 'normal',
            letterSpacing: -1,
            lineHeight: 1.4
        },
        waveform: {
            type: 'bars',
            position: 'bottom',
            color: '#64748B',
            count: 40
        },
        layout: {
            textAlign: 'left',
            padding: 120,
            maxWidth: 0.8,
            positions: {
                header: { x: 0.15, y: 0.1 },
                text: { x: 0.15, y: 0.45 },
                footer: { x: 0.15, y: 0.9 },
                waveform: { x: 0.5, y: 0.98 }
            }
        }
    },

    'indigo-aurora': {
        id: 'indigo-aurora',
        name: 'Indigo Aurora',
        description: 'Sophisticated depth and vibrance',
        background: {
            type: 'gradient',
            colors: ['#312E81', '#1E1B4B', '#0F172A'],
            angle: 160
        },
        card: { type: 'none' },
        typography: {
            fontFamily: 'Inter',
            fontSize: 54,
            fontWeight: 900,
            color: '#FFFFFF',
            style: 'normal',
            letterSpacing: -2.5,
            lineHeight: 1.1,
            shadow: { color: 'rgba(0,0,0,0.3)', blur: 20 }
        },
        waveform: {
            type: 'wave',
            position: 'bottom',
            color: 'rgba(129, 140, 248, 0.6)',
            thickness: 4,
            smoothness: 1
        },
        layout: {
            textAlign: 'center',
            padding: 60,
            maxWidth: 0.9,
            positions: {
                header: { x: 0.5, y: 0.08 },
                text: { x: 0.5, y: 0.42 },
                footer: { x: 0.5, y: 0.92 },
                waveform: { x: 0.5, y: 1.0 }
            }
        }
    },
    'halftone-lava': {
        id: 'halftone-lava',
        name: 'Halftone Lava',
        description: 'Organic wavy halftone pattern in deep red',
        background: {
            type: 'solid',
            colors: ['#0A0000'],
            pattern: 'halftone',
            patternColor: 'rgba(239, 68, 68, 0.4)',
            patternOpacity: 0.8
        },
        card: { type: 'none' },
        typography: {
            fontFamily: 'Inter',
            fontSize: 48,
            fontWeight: 800,
            color: '#FFFFFF',
            style: 'normal',
            letterSpacing: -1.5,
            lineHeight: 1.2
        },
        waveform: {
            type: 'bars',
            position: 'bottom',
            color: 'rgba(239, 68, 68, 0.6)',
            thickness: 3,
            count: 50
        },
        layout: {
            textAlign: 'left',
            padding: 100,
            maxWidth: 0.7,
            positions: {
                header: { x: 0.1, y: 0.12 },
                text: { x: 0.1, y: 0.45 },
                footer: { x: 0.1, y: 0.9 },
                waveform: { x: 0.1, y: 0.8 }
            }
        }
    },
    'matrix-blue': {
        id: 'matrix-blue',
        name: 'Matrix Blue',
        description: 'Deep textured gradient with fine micro-dots',
        background: {
            type: 'gradient',
            colors: ['#020617', '#0F172A'],
            angle: 135,
            pattern: 'liquid',
            patternColor: 'rgba(56, 189, 248, 0.2)',
            patternOpacity: 0.3
        },
        card: { type: 'none' },
        typography: {
            fontFamily: 'Inter',
            fontSize: 46,
            fontWeight: 400,
            color: '#F8FAFC',
            style: 'normal',
            letterSpacing: -0.5,
            lineHeight: 1.4
        },
        waveform: {
            type: 'mini',
            position: 'bottom',
            color: 'rgba(56, 189, 248, 0.4)',
            thickness: 2,
            count: 32
        },
        layout: {
            textAlign: 'center',
            padding: 100,
            maxWidth: 0.8,
            positions: {
                header: { x: 0.5, y: 0.15 },
                text: { x: 0.5, y: 0.5 },
                footer: { x: 0.5, y: 0.9 },
                waveform: { x: 0.5, y: 0.82 }
            }
        }
    },
    'technical-hud': {
        id: 'technical-hud',
        name: 'Technical HUD',
        description: 'Command center dashboard layout',
        background: {
            type: 'solid',
            colors: ['#020617'],
            pattern: 'grid',
            patternColor: 'rgba(255, 255, 255, 0.05)',
            patternOpacity: 1
        },
        card: {
            type: 'glass',
            opacity: 0.05,
            borderRadius: 12,
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1
        },
        typography: {
            fontFamily: 'Inter',
            fontSize: 40,
            fontWeight: 700,
            color: '#FFFFFF',
            style: 'normal',
            letterSpacing: -1,
            lineHeight: 1.3
        },
        waveform: {
            type: 'circle',
            position: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
            thickness: 1.5,
            radius: 120
        },
        layout: {
            textAlign: 'center',
            padding: 60,
            maxWidth: 0.6,
            showHUD: true,
            showSidebar: true,
            positions: {
                header: { x: 0.1, y: 0.08 },
                text: { x: 0.4, y: 0.5 },
                footer: { x: 0.4, y: 0.92 },
                waveform: { x: 0.4, y: 0.5 }
            }
        }
    }
};

// Helper Functions
export function getVideoStyle(styleId: string): VideoStyle {
    return VIDEO_STYLES[styleId] || VIDEO_STYLES['noir-minimal'];
}

export function getAllVideoStyles(): VideoStyle[] {
    return Object.values(VIDEO_STYLES);
}
