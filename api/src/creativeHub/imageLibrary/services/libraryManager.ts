/**
 * Image Library Manager
 * Central service for managing images in the creative studio
 */

export {
  uploadImage,
  UploadImageInput,
  UploadImageOutput
} from './libraryManager/uploadImage';

export {
  getImage,
  ImageRecord
} from './libraryManager/getImage';

export {
  listImages,
  ListImagesFilters,
  ListImagesOutput
} from './libraryManager/listImages';

export {
  updateImageMetadata,
  UpdateMetadataInput
} from './libraryManager/updateImageMetadata';

export {
  deleteImage
} from './libraryManager/deleteImage';
