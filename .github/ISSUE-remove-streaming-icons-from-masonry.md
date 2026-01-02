# Remove Streaming Icons from Masonry Grid Default View

## Description

Currently, streaming service icons (e.g., Hulu, HBO Max, etc.) are displayed directly on media cards in the masonry grid layout. These icons should be removed from the default card view and only shown in the detail modal/sheet when a user clicks to view more details.

## Current Behavior

- Streaming icons appear on media cards in the masonry grid (desktop view)
- Icons are clickable and open streaming service links
- Icons are shown in the detail modal/sheet (this should remain)

## Expected Behavior

- Streaming icons should **not** appear on media cards in the masonry grid default view
- Streaming icons should **only** appear in the detail modal/sheet (`WatchlistItemDetailSheet`)
- Cards should show: poster, title, year, runtime, rating, genre, and action buttons only

## Affected Components

- `src/components/MediaCard.tsx` - Remove streaming icons section (lines 158-179 in desktop view)
- `src/components/WatchlistItemDetailSheet.tsx` - Keep streaming icons (already implemented correctly)

## Implementation Details

The streaming icons are currently rendered in `MediaCard.tsx` in the desktop card view:

```tsx
{/* Streaming sources - compact icons */}
{item.streaming_sources && item.streaming_sources.length > 0 && (
  <div className="flex gap-1.5 flex-wrap">
    {Object.values(groupedSources).slice(0, 4).map((service: any, index: number) => (
      <button
        key={index}
        onClick={(e) => {
          e.stopPropagation();
          window.open(service.url, '_blank');
        }}
        className="p-1.5 rounded-md bg-secondary/50 hover:bg-secondary transition-colors"
        title={service.name}
      >
        <StreamingIcon
          serviceId={service.name.toLowerCase().replace(/[^a-z0-9]/g, '')}
          serviceName={service.name}
          className="w-4 h-4"
        />
      </button>
    ))}
  </div>
)}
```

This entire section should be removed from the `MediaCard` component. The streaming icons are already properly displayed in `WatchlistItemDetailSheet.tsx` (lines 164-190).

## Visual Reference

The streaming icons appear below the title/metadata and above the action buttons in the card view. They should be removed from this location but remain accessible in the detail modal.

## Testing Checklist

- [ ] Verify streaming icons are removed from masonry grid cards
- [ ] Verify streaming icons still appear in detail modal/sheet
- [ ] Test on both desktop and mobile views
- [ ] Verify cards still display all other information correctly (title, year, rating, etc.)
- [ ] Test clicking on cards still opens detail modal with streaming icons

## Related Pages

This affects all pages that use the masonry grid layout:
- Watchlist page
- Watched page  
- Favorites page
