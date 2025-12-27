let loaderPromise = null;

export const loadGoogleMaps = (apiKey) => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps only runs in browser"));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error("Missing Google Maps API key"));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps failed to load"));
      }
    };
    script.onerror = () => reject(new Error("Google Maps script error"));

    document.head.appendChild(script);
  });

  return loaderPromise;
};

export const getDistanceMatrix = async ({
  apiKey,
  origin,
  destination,
}) => {
  const google = await loadGoogleMaps(apiKey);

  return new Promise((resolve, reject) => {
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [destination],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status !== "OK") {
          reject(new Error(`DistanceMatrix status: ${status}`));
          return;
        }

        const element = response?.rows?.[0]?.elements?.[0];
        if (!element || element.status !== "OK") {
          reject(new Error("DistanceMatrix invalid response"));
          return;
        }

        resolve({
          distanceText: element.distance?.text || "",
          durationText: element.duration?.text || "",
        });
      }
    );
  });
};
