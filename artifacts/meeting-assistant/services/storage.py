from fastapi import HTTPException
from config import CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

cloudinary_available = False

if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
        )
        cloudinary_available = True
        print("✅ Cloudinary configurado")
    except Exception as e:
        print(f"⚠️ Error configurando Cloudinary: {e}")


def upload_file(file_bytes: bytes, folder: str = "meetings") -> str:
    if not cloudinary_available:
        raise HTTPException(
            status_code=500,
            detail="Cloudinary no configurado. Agrega CLOUDINARY_CLOUD_NAME, "
                   "CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en los Secrets."
        )
    import cloudinary.uploader as uploader
    result = uploader.upload(file_bytes, folder=folder, resource_type="auto")
    return result["secure_url"]
