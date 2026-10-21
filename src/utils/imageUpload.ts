import unipoleImg from '../assets/images/unipole_billboard_1790581927863.jpg';
import doohSmdImg from '../assets/images/dooh_smd_screen_1790581912551.jpg';
import bridgePanelImg from '../assets/images/bridge_panel_1790581944286.jpg';
import gantryImg from '../assets/images/gantry_urban_1790581956476.jpg';

export interface UploadedImageItem {
  id: string;
  dataUrl: string;
  name: string;
  sizeBytes?: number;
  isPrimary?: boolean;
  isNight?: boolean;
}

export const OOH_STOCK_TEMPLATES = [
  {
    id: 'stock-unipole',
    label: 'Standard Unipole / Billboard',
    type: 'Billboard',
    url: unipoleImg,
  },
  {
    id: 'stock-dooh',
    label: 'Digital SMD Screen',
    type: 'Digital Screen',
    url: doohSmdImg,
  },
  {
    id: 'stock-bridge',
    label: 'Bridge / Flyover Panel',
    type: 'Bridge Panel',
    url: bridgePanelImg,
  },
  {
    id: 'stock-gantry',
    label: 'Highway Overhead Gantry',
    type: 'Gantry',
    url: gantryImg,
  },
];

/**
 * Reads a File and resizes it to max 1600px for optimal in-memory/browser performance
 */
export const processUploadedImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image (JPEG, PNG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image.'));
      img.onload = () => {
        const MAX_DIM = 1600;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG 0.88 for crisp quality with tiny size
        const compressed = canvas.toDataURL('image/jpeg', 0.88);
        resolve(compressed);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
