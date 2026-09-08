/**
 * Utilitaire de compression et redimensionnement d'image côté client
 * Spécifiquement conçu pour les photos de profil (Avatars)
 * Redimensionne au format carré ou homothétique (max 500x500px)
 * Réduit les fichiers de 5-10 Mo à < 100 Ko en WebP/JPEG haute fidélité.
 */

export interface CompressionResult {
  blob: Blob;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  sizeKB: number;
}

export async function compressAndResizeImage(
  file: File,
  maxDimension: number = 500,
  quality: number = 0.85
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Le fichier sélectionné n\'est pas une image valide.'));
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          let targetWidth = img.width;
          let targetHeight = img.height;

          // Calcul homothétique sans dépasser maxDimension
          if (targetWidth > targetHeight) {
            if (targetWidth > maxDimension) {
              targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
              targetWidth = maxDimension;
            }
          } else {
            if (targetHeight > maxDimension) {
              targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
              targetHeight = maxDimension;
            }
          }

          // Cadrage centré carré pour un avatar esthétique
          const size = Math.min(maxDimension, Math.min(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Impossible d\'initialiser le contexte graphique 2D.'));
          }

          // Antialiasing haute qualité
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Calcul du découpage centré (crop carré)
          const minSourceDim = Math.min(img.width, img.height);
          const startX = (img.width - minSourceDim) / 2;
          const startY = (img.height - minSourceDim) / 2;

          ctx.drawImage(
            img,
            startX,
            startY,
            minSourceDim,
            minSourceDim,
            0,
            0,
            size,
            size
          );

          // Support WebP avec fallback JPEG
          const outputType = 'image/webp';

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // Tentative de repli en JPEG si WebP n'est pas supporté
                canvas.toBlob(
                  (fallbackBlob) => {
                    if (!fallbackBlob) {
                      return reject(new Error('Échec de la compression de l\'image.'));
                    }
                    finalizeResult(fallbackBlob, 'jpeg');
                  },
                  'image/jpeg',
                  quality
                );
                return;
              }
              finalizeResult(blob, 'webp');
            },
            outputType,
            quality
          );

          function finalizeResult(blob: Blob, ext: string) {
            const fileName = file.name.replace(/\.[^/.]+$/, '') + `_avatar.${ext}`;
            const compressedFile = new File([blob], fileName, {
              type: blob.type,
              lastModified: Date.now(),
            });

            const previewUrl = URL.createObjectURL(blob);

            resolve({
              blob,
              file: compressedFile,
              previewUrl,
              width: size,
              height: size,
              sizeBytes: blob.size,
              sizeKB: Math.round(blob.size / 1024),
            });
          }
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image.'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier.'));
    reader.readAsDataURL(file);
  });
}
