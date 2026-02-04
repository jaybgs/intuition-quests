import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

export const storageService = {
    /**
     * Upload an image to Supabase Storage
     * @param file The file to upload
     * @param bucket The bucket name (default: 'quest-images')
     * @param path Optional path (folder structure)
     * @returns Public URL of the uploaded image
     */
    async uploadImage(file: File, bucket: string = 'quest-images', path: string = ''): Promise<string | null> {
        // Base64 is now the primary method as requested
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result as string);
            };
            reader.onerror = () => {
                console.error('Error reading file as Data URL');
                resolve(null);
            };
            reader.readAsDataURL(file);
        });
    }
};
