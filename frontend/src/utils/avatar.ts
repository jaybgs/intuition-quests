/**
 * DiceBear Avatar Generator
 * Generates random avatar SVGs using different DiceBear styles
 */

// Available DiceBear styles
const DICEBEAR_STYLES = [
  'adventurer',
  'adventurer-neutral', 
  'avataaars',
  'avataaars-neutral',
  'big-ears',
  'big-ears-neutral',
  'big-smile',
  'bottts',
  'bottts-neutral',
  'croodles',
  'croodles-neutral',
  'fun-emoji',
  'icons',
  'identicon',
  'lorelei',
  'lorelei-neutral',
  'micah',
  'miniavs',
  'notionists',
  'notionists-neutral',
  'open-peeps',
  'personas',
  'pixel-art',
  'pixel-art-neutral',
  'rings',
  'shapes',
  'thumbs',
] as const;

/**
 * Generate a consistent random style based on a seed
 * Same seed will always return the same style
 */
function getStyleFromSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % DICEBEAR_STYLES.length;
  return DICEBEAR_STYLES[index];
}

/**
 * Generate a DiceBear avatar URL
 * @param seed - Unique identifier (wallet address, username, etc.)
 * @param size - Avatar size in pixels (default: 128)
 * @param style - Optional specific style, otherwise randomly selected based on seed
 */
export function getDiceBearAvatar(
  seed: string,
  size: number = 128,
  style?: string
): string {
  const avatarStyle = style || getStyleFromSeed(seed);
  const encodedSeed = encodeURIComponent(seed.toLowerCase());
  return `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodedSeed}&size=${size}`;
}

/**
 * Get avatar URL - returns stored profile pic or generates DiceBear avatar
 * @param address - Wallet address
 * @param storedPic - Stored profile picture URL (optional)
 */
export function getAvatarUrl(address: string | undefined, storedPic?: string | null): string {
  if (storedPic) {
    return storedPic;
  }
  
  if (!address) {
    return getDiceBearAvatar('anonymous');
  }
  
  return getDiceBearAvatar(address);
}

/**
 * Get a list of different avatar styles for a user to choose from
 * @param seed - Unique identifier
 * @param count - Number of options to generate
 */
export function getAvatarOptions(seed: string, count: number = 6): string[] {
  const options: string[] = [];
  const shuffledStyles = [...DICEBEAR_STYLES].sort(() => {
    // Use seed to get consistent shuffle
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 0.5 - Math.sin(hash + options.length);
  });
  
  for (let i = 0; i < Math.min(count, shuffledStyles.length); i++) {
    options.push(getDiceBearAvatar(seed, 128, shuffledStyles[i]));
  }
  
  return options;
}

export { DICEBEAR_STYLES };
