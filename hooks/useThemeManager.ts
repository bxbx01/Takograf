import { useEffect } from 'react';

/**
 * A custom hook to manage the application's theme based on the user's system preference.
 * It automatically adds or removes the 'dark' class from the html element.
 */
const useThemeManager = () => {
  useEffect(() => {
    // Clean up old manual theme setting if it exists from previous versions.
    localStorage.removeItem('tacho-theme');
    
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryList | MediaQueryListEvent) => {
        if (e.matches) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    };

    // Set the initial theme
    handleSystemThemeChange(mediaQuery);
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Cleanup listener on component unmount
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []); // Empty dependency array ensures this runs only once on mount.
};

export default useThemeManager;
