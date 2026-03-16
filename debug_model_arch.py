import sys
sys.path.insert(0, ".")
import h5py, json

MODEL_PATH = "models/emotion_model.h5"
with h5py.File(MODEL_PATH, "r") as f:
    config_raw = f.attrs.get("model_config", None)
    if config_raw:
        if isinstance(config_raw, bytes):
            config_raw = config_raw.decode("utf-8")
        config = json.loads(config_raw)
        print(json.dumps(config, indent=2)[:6000])
    else:
        print("No model_config found, listing keys:")
        print(list(f.keys()))
