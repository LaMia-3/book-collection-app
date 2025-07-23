import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	// Enhanced safelist for dynamic classes
	safelist: [
		// Spine color classes that will be generated dynamically
		'bg-spine-1', 'bg-spine-2', 'bg-spine-3', 'bg-spine-4',
		'bg-spine-5', 'bg-spine-6', 'bg-spine-7', 'bg-spine-8',
		'bg-spine-custom-1', 'bg-spine-custom-2', 'bg-spine-custom-3', 'bg-spine-custom-4',
		// Animation delay classes
		'delay-0', 'delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			screens: {
				'xs': '480px',
				'sm': '640px',
				'md': '768px',
				'lg': '1024px',
				'xl': '1280px',
				'2xl': '1536px',
			},
			animationDelay: {
				'100': '100ms',
				'200': '200ms',
				'300': '300ms',
				'400': '400ms',
				'500': '500ms',
			},
			animationDuration: {
				'400': '400ms',
				'600': '600ms',
				'800': '800ms',
				'1000': '1000ms',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					warm: 'hsl(var(--accent-warm))',
					cool: 'hsl(var(--accent-cool))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				spine: {
					1: 'hsl(var(--spine-1))',
					2: 'hsl(var(--spine-2))',
					3: 'hsl(var(--spine-3))',
					4: 'hsl(var(--spine-4))',
					5: 'hsl(var(--spine-5))',
					6: 'hsl(var(--spine-6))',
					7: 'hsl(var(--spine-7))',
					8: 'hsl(var(--spine-8))',
					'custom-1': 'hsl(var(--spine-custom-1))',
					'custom-2': 'hsl(var(--spine-custom-2))',
					'custom-3': 'hsl(var(--spine-custom-3))',
					'custom-4': 'hsl(var(--spine-custom-4))',
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			backgroundImage: {
				'gradient-shelf': 'var(--gradient-shelf)',
				'gradient-warm': 'var(--gradient-warm)',
				'gradient-page': 'var(--gradient-page)',
				'gradient-cool': 'var(--gradient-cool)',
				'gradient-success': 'var(--gradient-success)',
				'gradient-danger': 'var(--gradient-danger)',
				'gradient-shelf-dark': 'var(--gradient-shelf-dark)',
				'gradient-shelf-light': 'var(--gradient-shelf-light)',
				'gradient-shelf-side': 'var(--gradient-shelf-side)',
				'texture-wood': 'var(--texture-wood)'
			},
			boxShadow: {
				'book': 'var(--shadow-book)',
				'shelf': 'var(--shadow-shelf)',
				'elegant': 'var(--shadow-elegant)',
				'book-hover': 'var(--shadow-book-hover)',
				'intense': 'var(--shadow-intense)',
				'inner-shelf': 'var(--shadow-inner-shelf)'
			},
			fontFamily: {
				'serif': 'var(--font-serif)',
				'sans': 'var(--font-sans)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'book-hover': {
					'0%': { transform: 'translateY(0) scale(1)' },
					'100%': { transform: 'translateY(-4px) scale(1.02)' }
				},
				'spine-glow': {
					'0%, 100%': { boxShadow: '0 0 5px hsl(var(--primary) / 0.3)' },
					'50%': { boxShadow: '0 0 20px hsl(var(--primary) / 0.5)' }
				},
                'book-select': {
                    '0%': { transform: 'translateY(0) scale(1)', boxShadow: 'var(--shadow-book)' },
                    '50%': { transform: 'translateY(-8px) scale(1.05)', boxShadow: 'var(--shadow-elegant)' },
                    '100%': { transform: 'translateY(0) scale(1)', boxShadow: 'var(--shadow-book)' }
                },
                'book-add': {
                    '0%': { opacity: '0', transform: 'translateY(20px) scale(0.8)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
                },
                'book-remove': {
                    '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                    '100%': { opacity: '0', transform: 'translateY(20px) scale(0.8)' }
                },
                'shelf-stagger': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                }
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'book-hover': 'book-hover 0.3s ease-out forwards',
				'spine-glow': 'spine-glow 2s ease-in-out infinite',
                'book-select': 'book-select 0.5s ease-in-out',
                'book-add': 'book-add 0.4s ease-out forwards',
                'book-remove': 'book-remove 0.4s ease-out forwards',
                'shelf-stagger': 'shelf-stagger 0.5s ease-out forwards',
                'fade-in': 'fade-in 0.3s ease-out forwards'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
