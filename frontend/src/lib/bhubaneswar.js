export const DEFAULT_PINCODE = '751007'

export const BHUBANESWAR_LOCALITIES = [
  { name: 'Saheed Nagar', pincode: '751007' },
  { name: 'Jaydev Vihar', pincode: '751013' },
  { name: 'Patia', pincode: '751024' },
  { name: 'Chandrasekharpur', pincode: '751016' },
  { name: 'Nayapalli', pincode: '751012' },
  { name: 'Rasulgarh', pincode: '751010' },
  { name: 'Khandagiri', pincode: '751030' },
  { name: 'Kharvela Nagar', pincode: '751001' },
]

export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is unavailable in this browser. You can search with your PIN code instead.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location access was denied. You can search with your PIN code instead.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'Your location is unavailable right now. You can search with your PIN code instead.'
            : 'Location lookup timed out. You can search with your PIN code instead.'
        reject(new Error(message))
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  })
}
