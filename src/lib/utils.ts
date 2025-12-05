import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateColors(count: number): string[] {
  const colors: string[] = [];
  const goldenAngle = 137.508; // Approximate Golden Angle in degrees

  for (let i = 0; i < count; i++) {
    // Use Golden Angle approximation for optimal distribution across the spectrum
    const hue = (i * goldenAngle) % 360;
    // Saturation: 70% for vibrancy
    // Lightness: 50% for readability
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  return colors;
}
