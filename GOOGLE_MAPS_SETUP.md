# Google Maps API Setup Guide

## Issue: "Something Went Wrong" Error

If you're seeing the "something went wrong" error with Google Maps, follow these steps to fix it:

## Step 1: Check Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create a new one)

## Step 2: Enable Billing

**This is REQUIRED - Google Maps API doesn't work without billing enabled**

1. Click on "Billing" in the left sidebar
2. Link a billing account to your project
3. Add payment information (you get $200 free credit monthly)
4. Enable billing for the project

## Step 3: Enable Required APIs

Go to **APIs & Services** > **Library** and enable these APIs:

1. **Maps JavaScript API** (required for map display)
2. **Places API** (required for address autocomplete)
3. **Geocoding API** (required for lat/lng to address conversion)

## Step 4: Create/Check API Key

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy the API key

## Step 5: Configure API Key Restrictions (Important!)

### Application Restrictions:
- **For Development (localhost):**
  - Select "HTTP referrers (websites)"
  - Add: `http://localhost:*` and `http://localhost:3000/*`
  
- **For Production:**
  - Select "HTTP referrers (websites)"
  - Add your domain: `https://yourdomain.com/*` and `https://*.yourdomain.com/*`
  - Add Emergent preview URL: `https://sump-solution.preview.emergentagent.com/*`

### API Restrictions:
Click "Restrict key" and select:
- Maps JavaScript API
- Places API
- Geocoding API

## Step 6: Add API Key to Your App

1. Open `/app/frontend/.env`
2. Update the line:
   ```
   REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
   ```
3. Save the file
4. Restart the frontend: `sudo supervisorctl restart frontend`

## Step 7: Wait and Test

- API key changes can take 5-10 minutes to propagate
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Test the map functionality

## Common Issues:

### "For development purposes only" watermark
- Billing not enabled. Follow Step 2.

### "This page can't load Google Maps correctly"
- API key restrictions too strict. Check Step 5.
- Required APIs not enabled. Check Step 3.

### Map shows but search doesn't work
- Places API not enabled. Enable it in Step 3.

### Reverse geocoding not working
- Geocoding API not enabled. Enable it in Step 3.

## Troubleshooting:

1. **Check browser console** (F12) for specific error messages:
   - `InvalidKeyMapError` - API key is invalid
   - `BillingNotEnabledMapError` - Billing not enabled
   - `RefererNotAllowedMapError` - Domain not in allowed list
   - `ApiNotActivatedMapError` - Required API not enabled

2. **Test with a minimal example:**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places"></script>
   </head>
   <body>
     <div id="map" style="height: 400px; width: 100%;"></div>
     <script>
       new google.maps.Map(document.getElementById('map'), {
         center: { lat: 17.385044, lng: 78.486671 },
         zoom: 13
       });
     </script>
   </body>
   </html>
   ```

3. **Verify API key in URL:**
   Open in browser: `https://maps.googleapis.com/maps/api/js?key=YOUR_KEY`
   Should return JavaScript code, not an error.

## Cost Information:

- Google provides $200 free credit per month
- Maps JavaScript API: $7 per 1,000 loads (first 28,000 free)
- Places API: $17 per 1,000 requests (first 11,000 free)
- Most small apps stay within free tier

## Need Help?

If you've followed all steps and still have issues:
1. Check the error message in browser console (F12)
2. Verify all 3 APIs are enabled
3. Confirm billing is active
4. Wait 10 minutes after making changes
5. Try in incognito/private browsing mode
