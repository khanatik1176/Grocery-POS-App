import { CameraView, useCameraPermissions, type BarcodeType } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Linking, Pressable, Text, View } from "react-native";

import { Button, COLORS, Icon, IconButton } from "./ui";

const TYPES: BarcodeType[] = ["qr", "ean13", "ean8", "code128", "code39", "code93", "upc_a", "upc_e", "codabar", "itf14", "datamatrix"];
const FRAME = { width: 240, height: 130 };
const CORNER = 22;

function Corners() {
  const edge = { position: "absolute" as const, width: CORNER, height: CORNER, borderColor: "#FFFFFF" };
  return (
    <>
      <View style={[edge, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 }]} />
      <View style={[edge, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 }]} />
      <View style={[edge, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 }]} />
      <View style={[edge, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 }]} />
    </>
  );
}

function ScanLine() {
  const [travel] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(travel, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(travel, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [travel]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 10,
        right: 10,
        height: 2,
        borderRadius: 1,
        backgroundColor: COLORS.brand,
        shadowColor: COLORS.brand,
        shadowOpacity: 0.9,
        shadowRadius: 6,
        transform: [{ translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [8, FRAME.height - 10] }) }],
      }}
    />
  );
}

/**
 * Live barcode/QR scanner. It stays on until paused; a paused scanner shows
 * an overlay with a resume button. `active` false unmounts the camera (for
 * example when the screen loses focus) to save battery.
 */
export function ScannerPane({
  paused,
  onPause,
  onResume,
  onCode,
  active = true,
  height = 220,
  hint = "Align the barcode or QR code inside the frame",
}: {
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onCode: (code: string) => void;
  active?: boolean;
  height?: number;
  hint?: string;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const lock = useRef({ code: "", at: 0 });
  const [flash, setFlash] = useState<string | null>(null);

  function handle(raw: string | undefined) {
    const code = raw?.trim();
    if (!code) {
      return;
    }
    const now = Date.now();
    // The camera reports the same code many times a second; accept it again only after a pause.
    if (lock.current.code === code && now - lock.current.at < 1800) {
      return;
    }
    if (now - lock.current.at < 600) {
      return;
    }
    lock.current = { code, at: now };
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setFlash(code);
    setTimeout(() => setFlash((current) => (current === code ? null : current)), 900);
    onCode(code);
  }

  if (!permission) {
    return <View style={{ height }} className="rounded-xl bg-ink" />;
  }

  if (!permission.granted) {
    return (
      <View style={{ height }} className="items-center justify-center gap-3 rounded-xl bg-ink px-6">
        <Icon name="camera-outline" size={32} color="#FFFFFF" />
        <Text className="text-center text-sm leading-5 text-white/80">
          Allow camera access to scan barcodes and QR codes. You can still search manually.
        </Text>
        {permission.canAskAgain ? (
          <Button label="Allow camera" icon="camera" size="sm" onPress={() => void requestPermission()} />
        ) : (
          <Button label="Open settings" icon="settings-outline" size="sm" onPress={() => void Linking.openSettings()} />
        )}
      </View>
    );
  }

  return (
    <View style={{ height }} className="overflow-hidden rounded-xl bg-black">
      {active ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          enableTorch={torch && !paused}
          active={!paused}
          barcodeScannerSettings={{ barcodeTypes: TYPES }}
          onBarcodeScanned={paused ? undefined : (event) => handle(event.data)}
        />
      ) : null}

      {!paused ? (
        <View pointerEvents="box-none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
          <View pointerEvents="none" className="flex-1 items-center justify-center">
            <View style={FRAME}>
              <Corners />
              <ScanLine />
            </View>
            <View className="mt-3 rounded-full bg-black/50 px-3 py-1">
              <Text className="text-xs font-medium text-white">{flash ? `Scanned ${flash}` : hint}</Text>
            </View>
          </View>
          <View className="absolute right-3 top-3 flex-row gap-2">
            <IconButton icon={torch ? "flashlight" : "flashlight-outline"} label={torch ? "Torch off" : "Torch on"} tone="dark" size={36} onPress={() => setTorch((on) => !on)} />
            <IconButton icon="pause" label="Pause scanner" tone="dark" size={36} onPress={onPause} />
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Resume scanner"
          onPress={onResume}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          className="items-center justify-center gap-3 bg-ink/95"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
            <Icon name="play" size={26} color={COLORS.ink} />
          </View>
          <Text className="text-base font-semibold text-white">Resume scanning</Text>
          <Text className="text-xs text-white/60">Scanner is paused</Text>
        </Pressable>
      )}
    </View>
  );
}
