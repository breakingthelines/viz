import { useState } from 'react';
import { monogram } from '#/football/lib/player-name';

export interface PasserAvatarProps {
  /** Player display name, used for the monogram fallback. */
  name: string;
  /** Remote headshot URL. When absent, or when it fails to load, the monogram shows. */
  imageUrl?: string;
  /** Ring colour. */
  color: string;
}

/**
 * Small circular passer headshot for the Line breaking hover callout. Falls
 * back to the player's monogram when there's no photo, or when the supplied one
 * fails to load (a 404 or dead link), so a missing image never leaves a blank
 * chip.
 *
 * A plain `<img>`, with no `crossOrigin`, for the reason given on {@link Crest}.
 */
export function PasserAvatar({ name, imageUrl, color }: PasserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showPhoto = typeof imageUrl === 'string' && imageUrl.length > 0 && !failed;
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ boxShadow: `inset 0 0 0 1px ${color}` }}
    >
      {showPhoto ? (
        <img
          src={imageUrl}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-[9px] font-semibold leading-none text-white/70">
          {monogram(name)}
        </span>
      )}
    </span>
  );
}
