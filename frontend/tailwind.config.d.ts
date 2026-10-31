declare const _default: {
    darkMode: ["class"];
    content: string[];
    theme: {
        container: {
            center: true;
            padding: string;
            screens: {
                '2xl': string;
            };
        };
        extend: {
            colors: {
                brand: {
                    50: string;
                    100: string;
                    200: string;
                    300: string;
                    400: string;
                    500: string;
                    600: string;
                    700: string;
                    800: string;
                    900: string;
                    950: string;
                };
                ink: {
                    0: string;
                    25: string;
                    50: string;
                    100: string;
                    150: string;
                    200: string;
                    300: string;
                    400: string;
                    500: string;
                    600: string;
                    700: string;
                    800: string;
                    850: string;
                    900: string;
                    925: string;
                    950: string;
                    DEFAULT: string;
                };
                background: string;
                foreground: string;
                card: {
                    DEFAULT: string;
                    foreground: string;
                };
                popover: {
                    DEFAULT: string;
                    foreground: string;
                };
                'surface-2': string;
                sidebar: string;
                primary: {
                    DEFAULT: string;
                    hover: string;
                    foreground: string;
                    soft: string;
                    text: string;
                };
                'primary-soft': string;
                'primary-text': string;
                secondary: {
                    DEFAULT: string;
                    foreground: string;
                };
                muted: {
                    DEFAULT: string;
                    foreground: string;
                };
                'subtle-foreground': string;
                accent: {
                    DEFAULT: string;
                    foreground: string;
                };
                destructive: {
                    DEFAULT: string;
                    foreground: string;
                };
                border: {
                    DEFAULT: string;
                    strong: string;
                };
                'border-strong': string;
                input: string;
                ring: string;
                success: {
                    DEFAULT: string;
                    muted: string;
                    icon: string;
                };
                warning: {
                    DEFAULT: string;
                    muted: string;
                    icon: string;
                };
                danger: {
                    DEFAULT: string;
                    muted: string;
                    icon: string;
                };
                skeleton: string;
            };
            fontFamily: {
                sans: [string, string, ...string[]];
                mono: [string, ...string[]];
            };
            fontSize: {
                '2xs': [string, {
                    lineHeight: string;
                }];
                xs: [string, {
                    lineHeight: string;
                }];
                sm: [string, {
                    lineHeight: string;
                }];
                base: [string, {
                    lineHeight: string;
                }];
                md: [string, {
                    lineHeight: string;
                    fontWeight: string;
                }];
                lg: [string, {
                    lineHeight: string;
                    letterSpacing: string;
                }];
                xl: [string, {
                    lineHeight: string;
                    letterSpacing: string;
                }];
                '2xl': [string, {
                    lineHeight: string;
                    letterSpacing: string;
                }];
            };
            borderRadius: {
                sm: string;
                DEFAULT: string;
                md: string;
                lg: string;
                xl: string;
                sheet: string;
            };
            spacing: {
                4.5: string;
                13: string;
                15: string;
                sidebar: string;
                drawer: string;
            };
            boxShadow: {
                xs: string;
                overlay: string;
                focus: string;
                'focus-danger': string;
            };
            transitionDuration: {
                DEFAULT: string;
            };
            keyframes: {
                'sheet-in': {
                    from: {
                        transform: string;
                        opacity: string;
                    };
                    to: {
                        transform: string;
                        opacity: string;
                    };
                };
                'sheet-up': {
                    from: {
                        transform: string;
                        opacity: string;
                    };
                    to: {
                        transform: string;
                        opacity: string;
                    };
                };
            };
            animation: {
                'sheet-in': string;
                'sheet-up': string;
            };
        };
    };
    plugins: {
        handler: () => void;
    }[];
};
export default _default;
