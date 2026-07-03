@echo off
pip install fastapi uvicorn python-multipart python-docx pypdfium2 paddlepaddle arabic-reshaper python-bidi aiofiles Pillow
pip install paddleocr --no-deps
pip install shapely scikit-image imgaug pyclipper lmdb tqdm visualdl rapidfuzz opencv-python opencv-contrib-python cython premailer openpyxl attrdict lxml
echo Done installing backend dependencies.
