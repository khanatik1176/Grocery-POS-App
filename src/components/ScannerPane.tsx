import { CameraView, useCameraPermissions, type BarcodeType } from "expo-camera";
import { useRef } from "react";
import { Pressable, Text, View } from "react-native";

const TYPES: BarcodeType[] = ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e", "codabar", "itf14"];

export function ScannerPane({
  paused,
  onPause,
  onResume,
  onCode,
}: {
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onCode: (code: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const lock = useRef({ code: "", at: 0 });

  return (
    <View className="h-64 overflow-hidden rounded-3xl bg-black">
      {permission?.granted ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: TYPES }}
          onBarcodeScanned={
            paused
              ? undefined
              : (event) => {
                  const code = event.data?.trim();
                  if (!code) {
                    return;
                  }
                  const now = Date.now();
                  if (lock.current.code === code && now - lock.current.at < 1500) {
                    return;
                  }
                  lock.current = { code, at: now };
                  onCode(code);
                }
          }
        />
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-cream">
            The camera reads barcodes and QR codes as soon as they sit in the frame.
          </Text>
          <Pressable accessibilityRole="button" onPress={requestPermission} className="mt-4 rounded-full bg-paper px-4 py-2">
            <Text className="font-semibold text-ink">Allow camera</Text>
          </Pressable>
        </View>
      )}
      {permission?.granted && !paused ? (
        <View pointerEvents="box-none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
          <View className="flex-1 items-center justify-center">
            <View className="h-40 w-60">
              <View style={{ position: "absolute", top: 0, left: 0, width: 28, height: 28, borderTopWidth: 3, borderLeftWidth: 3, borderColor: "#E6A11A" }} />
              <View style={{ position: "absolute", top: 0, right: 0, width: 28, height: 28, borderTopWidth: 3, borderRightWidth: 3, borderColor: "#E6A11A" }} />
              <View style={{ position: "absolute", bottom: 0, left: 0, width: 28, height: 28, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: "#E6A11A" }} />
              <View style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderBottomWidth: 3, borderRightWidth: 3, borderColor: "#E6A11A" }} />
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onPause}
            className="absolute right-3 top-3 rounded-full bg-ink/80 px-3 py-2"
          >
            <Text className="text-sm font-semibold text-saffron">Pause</Text>
          </Pressable>
        </View>
      ) : null}
      {paused ? (
        <View
          className="items-center justify-center bg-ink/90 px-6"
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <Text className="mb-4 text-center text-base text-cream">Scanner is paused.</Text>
          <Pressable accessibilityRole="button" onPress={onResume} className="rounded-full bg-paper px-5 py-3">
            <Text className="text-base font-semibold text-ink">Resume scanner</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
