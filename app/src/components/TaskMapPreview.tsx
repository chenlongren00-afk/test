import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { Map, MapPin, Maximize2 } from "lucide-react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { AHButton, Card, Pill } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";
import type { HelperTask } from "@/types/marketplace";
import { money } from "@/utils/format";

type Coordinate = {
  latitude: number;
  longitude: number;
};

const knownCoordinates: Record<string, Coordinate> = {
  "melbournecbd|vic": { latitude: -37.8136, longitude: 144.9631 },
  "melbourne|vic": { latitude: -37.8136, longitude: 144.9631 },
  "southbank|vic": { latitude: -37.823, longitude: 144.965 },
  "richmond|vic": { latitude: -37.8183, longitude: 145.0018 },
  "boxhill|vic": { latitude: -37.8191, longitude: 145.1215 },
  "boxhillnorth|vic": { latitude: -37.8027, longitude: 145.1262 },
  "boxhillsouth|vic": { latitude: -37.835, longitude: 145.1204 },
  "blackburn|vic": { latitude: -37.8192, longitude: 145.1539 },
  "blackburnnorth|vic": { latitude: -37.8092, longitude: 145.1517 },
  "blackburnsouth|vic": { latitude: -37.835, longitude: 145.15 },
  "clayton|vic": { latitude: -37.9162, longitude: 145.1304 },
  "glenwaverley|vic": { latitude: -37.8781, longitude: 145.1648 },
  "mountwaverley|vic": { latitude: -37.877, longitude: 145.1286 },
  "doncaster|vic": { latitude: -37.787, longitude: 145.125 },
  "burwood|vic": { latitude: -37.8498, longitude: 145.1117 },
  "preston|vic": { latitude: -37.7387, longitude: 145.0005 },
  "sydney|nsw": { latitude: -33.8688, longitude: 151.2093 },
  "parramatta|nsw": { latitude: -33.815, longitude: 151.0011 },
  "chatswood|nsw": { latitude: -33.7969, longitude: 151.184 },
  "hurstville|nsw": { latitude: -33.967, longitude: 151.1027 },
  "burwood|nsw": { latitude: -33.8774, longitude: 151.1032 },
  "strathfield|nsw": { latitude: -33.8711, longitude: 151.0941 },
  "eastwood|nsw": { latitude: -33.7918, longitude: 151.0806 },
  "rhodes|nsw": { latitude: -33.8296, longitude: 151.0851 },
  "ashfield|nsw": { latitude: -33.8883, longitude: 151.1246 },
  "bankstown|nsw": { latitude: -33.9173, longitude: 151.0359 },
  "bondijunction|nsw": { latitude: -33.891, longitude: 151.2489 },
  "zetland|nsw": { latitude: -33.9074, longitude: 151.2088 },
  "haymarket|nsw": { latitude: -33.879, longitude: 151.2057 },
  "liverpool|nsw": { latitude: -33.9209, longitude: 150.9237 },
  "blacktown|nsw": { latitude: -33.771, longitude: 150.9063 },
  "epping|nsw": { latitude: -33.7727, longitude: 151.0819 },
  "macquariepark|nsw": { latitude: -33.7756, longitude: 151.119 },
  "northsydney|nsw": { latitude: -33.839, longitude: 151.207 },
  "surryhills|nsw": { latitude: -33.8846, longitude: 151.2122 },
  "newtown|nsw": { latitude: -33.8981, longitude: 151.1745 },
  "randwick|nsw": { latitude: -33.9167, longitude: 151.2417 },
  "brisbanecity|qld": { latitude: -27.4698, longitude: 153.0251 },
  "adelaide|sa": { latitude: -34.9285, longitude: 138.6007 },
  "perth|wa": { latitude: -31.9523, longitude: 115.8613 },
  "hobart|tas": { latitude: -42.8821, longitude: 147.3272 },
  "darwincity|nt": { latitude: -12.4634, longitude: 130.8456 },
  "canberra|act": { latitude: -35.2809, longitude: 149.13 }
};

const stateCenters: Record<string, Coordinate> = {
  VIC: { latitude: -37.8136, longitude: 144.9631 },
  NSW: { latitude: -33.8688, longitude: 151.2093 },
  QLD: { latitude: -27.4698, longitude: 153.0251 },
  SA: { latitude: -34.9285, longitude: 138.6007 },
  WA: { latitude: -31.9523, longitude: 115.8613 },
  TAS: { latitude: -42.8821, longitude: 147.3272 },
  NT: { latitude: -12.4634, longitude: 130.8456 },
  ACT: { latitude: -35.2809, longitude: 149.13 }
};

export function TaskMapPreview({
  tasks,
  onExpand,
  compact = false,
  expanded = false,
  fullScreen = false
}: {
  tasks: HelperTask[];
  onExpand: () => void;
  compact?: boolean;
  expanded?: boolean;
  fullScreen?: boolean;
}) {
  const store = useAppStore();
  const visibleTasks = tasks.slice(0, expanded ? 24 : compact ? 5 : 8);
  const pins = React.useMemo(() => visibleTasks.map((task) => ({ task, coordinate: coordinateForTask(task) })), [visibleTasks]);
  const region = React.useMemo(() => mapRegion(pins.map((pin) => pin.coordinate)), [pins]);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(pins[0]?.task.id ?? null);
  const selectedPin = pins.find((pin) => pin.task.id === selectedTaskId) ?? pins[0];

  if (fullScreen) {
    return (
      <View style={{ backgroundColor: "#DDEBE8", flex: 1, overflow: "hidden" }}>
        {pins.length ? (
          <>
            <InlineTaskMap
              pins={pins}
              region={region}
              selectedTaskId={selectedPin?.task.id ?? null}
              onSelectTask={setSelectedTaskId}
            />
            <SelectedTaskOverlay pin={selectedPin} />
          </>
        ) : (
          <View style={{ alignItems: "center", flex: 1, justifyContent: "center", padding: 18 }}>
            <Text selectable style={{ color: colors.muted, fontSize: 15, fontWeight: "900", textAlign: "center" }}>
              {store.translate("noMappableTasks")}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <Card>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
        <Map color={colors.primary} size={22} />
        <Text selectable style={{ color: colors.text, flex: 1, fontSize: 16, fontWeight: "900" }}>
          {store.translate("mapPreview")}
        </Text>
        <Pill label={`${tasks.length}`} />
        {!expanded ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={store.translate("expandMap")}
            onPress={onExpand}
            style={{ alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: 8, height: 42, justifyContent: "center", width: 42 }}
          >
            <Maximize2 color={colors.primary} size={20} />
          </Pressable>
        ) : null}
      </View>
      <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
        {store.translate("liveTaskLocationsBody")}
      </Text>
      {pins.length ? (
        <View
          style={{
            backgroundColor: "#DDEBE8",
            borderColor: colors.border,
            borderRadius: 8,
            borderWidth: 1,
            height: expanded ? 480 : compact ? 210 : 280,
            overflow: "hidden"
          }}
        >
          <InlineTaskMap
            pins={pins}
            region={region}
            selectedTaskId={selectedPin?.task.id ?? null}
            onSelectTask={setSelectedTaskId}
          />
          <SelectedTaskOverlay pin={selectedPin} />
        </View>
      ) : (
        <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, minHeight: compact ? 156 : 210, padding: 12 }}>
          <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "800" }}>
            {store.translate("noMappableTasks")}
          </Text>
        </View>
      )}
      {!expanded ? <AHButton label={store.translate("expandMap")} tone="secondary" onPress={onExpand} /> : null}
    </Card>
  );
}

function SelectedTaskOverlay({ pin }: { pin?: { task: HelperTask; coordinate: Coordinate } }) {
  if (!pin) return null;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        bottom: 12,
        left: 12,
        padding: 12,
        position: "absolute",
        right: 12,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        zIndex: 20
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
        <MapPin color={colors.primary} size={18} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text selectable numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: "900" }}>
            {pin.task.title}
          </Text>
          <Text selectable numberOfLines={1} style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
            {pin.task.suburb}, {pin.task.state}
          </Text>
        </View>
        <Text selectable style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }}>
          {money(pin.task.budget)}
        </Text>
      </View>
    </View>
  );
}

function InlineTaskMap({
  region,
  pins,
  selectedTaskId,
  onSelectTask
}: {
  region: ReturnType<typeof mapRegion>;
  pins: { task: HelperTask; coordinate: Coordinate }[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}) {
  const store = useAppStore();
  const mapHtml = React.useMemo(() => buildLeafletMapHtml({ pins, region, selectedTaskId }), [pins, region, selectedTaskId]);
  const handleMessage = React.useCallback(
    (event: WebViewMessageEvent) => {
      const taskId = event.nativeEvent.data;
      if (pins.some((pin) => pin.task.id === taskId)) {
        onSelectTask(taskId);
      }
    },
    [onSelectTask, pins]
  );

  return (
    <View style={{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }}>
      <WebView
        androidLayerType="software"
        domStorageEnabled
        javaScriptEnabled
        onMessage={handleMessage}
        originWhitelist={["*"]}
        scalesPageToFit={false}
        source={{ html: mapHtml, baseUrl: "https://australianhelper.com" }}
        style={{ backgroundColor: "#DDEBE8", flex: 1 }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: "rgba(255,255,255,0.9)",
          borderRadius: 999,
          bottom: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
          position: "absolute",
          right: 8
        }}
      >
        <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>{store.translate("taskPins")}</Text>
      </View>
    </View>
  );
}

function buildLeafletMapHtml({
  pins,
  region,
  selectedTaskId
}: {
  pins: { task: HelperTask; coordinate: Coordinate }[];
  region: ReturnType<typeof mapRegion>;
  selectedTaskId: string | null;
}) {
  const centerLatitude = (region.minLat + region.maxLat) / 2;
  const centerLongitude = (region.minLon + region.maxLon) / 2;
  const safePins = pins.map((pin, index) => ({
    id: pin.task.id,
    index: index + 1,
    latitude: pin.coordinate.latitude,
    longitude: pin.coordinate.longitude,
    title: pin.task.title,
    suburb: pin.task.suburb,
    state: pin.task.state,
    budget: money(pin.task.budget),
    selected: pin.task.id === selectedTaskId
  }));

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #DDEBE8; }
    .leaflet-container { background: #DDEBE8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .ah-pin {
      align-items: center;
      background: #0F756D;
      border: 3px solid #fff;
      border-radius: 999px;
      box-shadow: 0 6px 16px rgba(13, 54, 50, 0.28);
      color: #fff;
      display: flex;
      font-size: 13px;
      font-weight: 900;
      height: 30px;
      justify-content: center;
      width: 30px;
    }
    .ah-pin-selected {
      background: #F5A400;
      color: #0B1C38;
      height: 38px;
      width: 38px;
    }
    .ah-popup {
      color: #0B1C38;
      font-size: 13px;
      line-height: 1.25;
      min-width: 170px;
    }
    .ah-popup strong { display: block; margin-bottom: 4px; }
    .ah-popup span { color: #65758E; display: block; font-weight: 700; margin-bottom: 6px; }
    .ah-popup b { color: #0F756D; font-size: 15px; }
    .leaflet-control-attribution { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const pins = ${JSON.stringify(safePins)};
    const selectedTaskId = ${JSON.stringify(selectedTaskId)};
    const map = L.map('map', { zoomControl: false, attributionControl: true }).setView([${centerLatitude}, ${centerLongitude}], 11);
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    const bounds = [];
    pins.forEach((pin) => {
      const selected = pin.id === selectedTaskId;
      const icon = L.divIcon({
        className: '',
        html: '<div class="ah-pin ' + (selected ? 'ah-pin-selected' : '') + '">' + pin.index + '</div>',
        iconSize: selected ? [38, 38] : [30, 30],
        iconAnchor: selected ? [19, 19] : [15, 15]
      });
      const marker = L.marker([pin.latitude, pin.longitude], { icon }).addTo(map);
      marker.bindPopup(
        '<div class="ah-popup"><strong>' + escapeHtml(pin.title) + '</strong><span>' +
        escapeHtml(pin.suburb + ', ' + pin.state) + '</span><b>' + escapeHtml(pin.budget) + '</b></div>'
      );
      marker.on('click', () => {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(pin.id);
      });
      if (selected) marker.openPopup();
      bounds.push([pin.latitude, pin.longitude]);
    });
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [42, 42], maxZoom: 13 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    }
    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[char]));
    }
  </script>
</body>
</html>`;
}

function coordinateForTask(task: HelperTask): Coordinate {
  const key = locationKey(task.suburb, task.state);
  if (knownCoordinates[key]) {
    return knownCoordinates[key];
  }

  const base = stateCenters[String(task.state || "").trim().toUpperCase()] ?? stateCenters.VIC;
  const seed = stableHash(`${task.id}|${task.suburb}|${task.state}`);
  const latOffset = (seed % 70) / 1000 - 0.035;
  const lonOffset = (Math.floor(seed / 97) % 70) / 1000 - 0.035;
  return { latitude: base.latitude + latOffset, longitude: base.longitude + lonOffset };
}

function mapRegion(coordinates: Coordinate[]) {
  if (!coordinates.length) {
    return { minLat: -37.96, maxLat: -37.66, minLon: 144.8, maxLon: 145.18 };
  }

  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const latPadding = Math.max(0.04, (maxLat - minLat) * 0.35);
  const lonPadding = Math.max(0.04, (maxLon - minLon) * 0.35);

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLon: minLon - lonPadding,
    maxLon: maxLon + lonPadding
  };
}

function locationKey(suburb: string, state: string) {
  const normalizedSuburb = String(suburb || "")
    .toLowerCase()
    .replace(/\b\d{4}\b/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join("");
  const normalizedState = String(state || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join("");
  return `${normalizedSuburb}|${normalizedState}`;
}

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
