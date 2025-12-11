/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                gold: {
                    400: '#e0b878',
                    500: '#d0a868', // Primary Brand Gold
                    600: '#b08d55',
                },
                dark: {
                    900: '#0A0F0A', // Deepest background
                    800: '#111818', // Card background
                    700: '#1A2222', // Hover/Border
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
