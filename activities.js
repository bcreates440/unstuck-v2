// The activity rule set (v2).
//
// The user never browses this — the engine treats each entry as a CONSTRAINT-TAGGED
// TEMPLATE, filters by constraints + real-world context (time of day, daylight,
// weather, how far the user will travel), scores the survivors, picks ONE, and renders
// it into a single specific, immediately-startable instruction.
//
// Fields:
//   vibe        array of 'calm' | 'creative' | 'adventurous' | 'productive'
//   energy      array of 'low' | 'medium' | 'high'
//   social      'solo' | 'social' | 'either'
//   budget      'free' | 'low'
//   env         'indoor' | 'outdoor' | 'either'
//   reach       'here' (no travel) | 'walk' (short walk) | 'drive' (short drive)  -- NEW in v2
//   minMinutes  realistic floor to do it at all
//   daypart     subset of ['day','evening','night']
//   needsOpen   true if it needs shops/venues open
//   needsLight  true if it genuinely needs daylight (gated on real sunset in v2)  -- NEW
//   weatherOnly optional: only surfaces in this weather, e.g. ['wet'] | ['snow'] |
//               ['clear'] | ['fog'] | ['hot'] | ['cold'] | ['thunder']  -- NEW
//   seasons     optional: only surfaces this season, e.g. ['winter']  -- NEW (calendar)
//   minTemp     optional °C floor — only enforced when a real reading exists  -- NEW
//   maxTemp     optional °C ceiling — only enforced when a real reading exists  -- NEW
//   tags        free-form, matched against "I'm stuck doing ___"
//   text(ctx)   the rendered, specific instruction. ctx = { minutes, hour, daypart, weather }

function dur(ctx, lo, hi) {
  if (ctx.minutes === Infinity) return U.int(lo, hi);
  return Math.max(lo, Math.min(hi, ctx.minutes - 2));
}

const ACTIVITIES = [
  // ---------- calm / restorative ----------
  {
    id: 'sit-outside', vibe: ['calm'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['scrolling', 'overstimulated', 'anxious'],
    text: (ctx) => {
      const p = ctx.nearby(['park']);
      return p
        ? `Walk to ${p.name} (about ${p.minutes} min away) and sit there for 10 minutes with your phone out of reach. Just watch what moves.`
        : `Sit outside in a public or open space for 10 minutes with your phone fully out of reach. Just watch what moves.`;
    },
  },
  {
    id: 'hot-drink-window', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['scrolling', 'tired', 'numb'],
    text: () => `Make a hot drink and drink the whole thing standing or sitting at a window. No phone, no screen — just the drink and the view.`,
  },
  {
    id: 'floor-nothing', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['overwhelmed', 'tired', 'wired'],
    text: () => `Lie flat on the floor and do nothing for ${U.int(5, 10)} minutes. Let your back fully touch the ground. That's the whole task.`,
  },
  {
    id: 'name-sounds', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['anxious', 'scrolling', 'overstimulated'],
    text: () => `Open a window or step outside. Close your eyes for 3 minutes and silently name every distinct sound you can hear — aim for ${U.int(5, 8)}.`,
  },
  {
    id: 'breathe', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['anxious', 'wired', 'panicky'],
    text: () => `Breathe in for 4, hold for 7, out for 8. Do ${U.int(4, 6)} slow rounds. Count on your fingers so your hands have a job.`,
  },
  {
    id: 'plant-look', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['numb', 'scrolling'],
    text: () => `Find the nearest living plant — yours or one outside. Look at it up close for 2 full minutes. Notice ${U.int(3, 5)} things you'd never normally see.`,
  },

  // ---------- creative ----------
  {
    id: 'walk-photos', vibe: ['creative', 'adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'], needsLight: true,
    tags: ['scrolling', 'bored', 'stuck'],
    text: (ctx) => `Walk ${dur(ctx, 12, 20)} minutes in ${U.dir()} and photograph ${U.int(4, 6)} objects that feel out of place. Don't overthink which ones.`,
  },
  {
    id: 'draw-nearest', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['scrolling', 'bored'],
    text: () => `Grab any pen and paper. Draw the nearest object without lifting the pen off the page. 5 minutes. It's allowed to look terrible.`,
  },
  {
    id: 'four-line-poem', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['bored', 'numb'],
    text: () => `Write a 4-line poem about the first thing your eyes land on right now. No editing. Read it out loud once, then it's done.`,
  },
  {
    id: 'photo-angles', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['scrolling', 'bored'],
    text: () => `Pick one ordinary object near you. Photograph it from ${U.int(5, 7)} completely different angles. Try to make at least one look strange.`,
  },
  {
    id: 'voice-memo', vibe: ['creative', 'calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['numb', 'stuck', 'lonely'],
    text: () => `Record a 60-second voice memo describing your day to yourself one year from now. Then close the app — don't re-listen.`,
  },
  {
    id: 'shelf-by-color', vibe: ['creative', 'productive'], energy: ['medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['restless', 'bored'],
    text: () => `Pick one shelf, drawer, or surface. Rearrange everything on it by color. Stop the moment it's done — don't move to the next one.`,
  },
  {
    id: 'kitchen-make', vibe: ['creative'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['bored', 'hungry'],
    text: () => `Make something edible using only things already open or about to expire in your kitchen. No shopping, no recipe. Name it when you're done.`,
  },

  // ---------- adventurous / out-of-house ----------
  {
    id: 'never-been-inside', vibe: ['adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['day', 'evening'], needsOpen: true,
    tags: ['stuck', 'bored', 'restless'],
    text: (ctx) => {
      const p = ctx.nearby(['eatery', 'cafe']);
      return p
        ? `Head to ${p.name} (about ${p.minutes} min away) — somewhere you've maybe never been inside. Order or grab the single cheapest thing they have.`
        : `Go ${dur(ctx, 8, 12)} minutes from here and walk into a place you've never been inside before. Order or pick up the cheapest thing they have.`;
    },
  },
  {
    id: 'grocery-new-item', vibe: ['adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['day', 'evening'], needsOpen: true,
    tags: ['bored', 'stuck'],
    text: (ctx) => {
      const p = ctx.nearby(['grocery']);
      const where = p ? `${p.name} (about ${p.minutes} min away)` : 'any grocery store';
      return `Go to ${where} and buy exactly one item you have never bought before. Don't research it. Eat or use it tonight.`;
    },
  },
  {
    id: 'library-random', vibe: ['adventurous', 'calm'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['day'], needsOpen: true,
    tags: ['scrolling', 'bored', 'stuck'],
    text: (ctx) => {
      const p = ctx.nearby(['library', 'books']);
      const where = p ? `${p.name} (about ${p.minutes} min away)` : 'a library or bookstore';
      return `Go to ${where}. Pull a random book off a shelf you'd normally ignore, open to a random page, read 2 pages, put it back, and leave.`;
    },
  },
  {
    id: 'farthest-point', vibe: ['adventurous', 'productive'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day', 'evening'],
    tags: ['restless', 'wired', 'stuck'],
    text: (ctx) => { const m = dur(ctx, 10, 30); return `Walk the farthest you can get from here in ${Math.floor(m / 2)} minutes, then turn around and come straight back. No destination — the turnaround is the point.`; },
  },
  {
    id: 'new-route', vibe: ['adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['bored', 'stuck', 'autopilot'],
    text: () => `Pick somewhere you go all the time. Walk or drive there by a route you have literally never taken. Notice one thing you've never seen.`,
  },
  {
    id: 'find-water', vibe: ['adventurous', 'calm'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['stuck', 'numb'],
    text: (ctx) => {
      const p = ctx.nearby(['water']);
      return p
        ? `Head to ${p.name} (about ${p.minutes} min away) and stand near the water for 5 minutes. Just watch it move — that's the whole thing.`
        : `Find the nearest water you can reach on foot or a short drive — a fountain, creek, pond, river, anything. Stand near it for 5 minutes and just watch it.`;
    },
  },
  {
    id: 'unwalked-block', vibe: ['adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['bored', 'restless', 'stuck'],
    text: (ctx) => `Walk ${dur(ctx, 10, 25)} minutes into a part of your own neighborhood you've never actually walked through. Turn down at least 2 streets you don't recognize.`,
  },

  // ---------- productive (single, bounded) ----------
  {
    id: 'one-drawer', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['procrastinating', 'overwhelmed', 'stuck'],
    text: (ctx) => `Set a timer for ${Math.min(ctx.minutes === Infinity ? 12 : ctx.minutes, 15)} minutes. Declutter ONE drawer. When it rings, stop — even if you're not done.`,
  },
  {
    id: 'one-message', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['procrastinating', 'avoiding', 'anxious'],
    text: () => `Answer the ONE message or email you've been avoiding. Just that one. Keep it short. Send it, then close the app.`,
  },
  {
    id: 'dishes-only', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['procrastinating', 'overwhelmed', 'numb'],
    text: () => `Wash whatever dishes are in or near the sink. Nothing more — don't wipe the counters, don't start a bigger clean. Just the dishes, then stop.`,
  },
  {
    id: 'ten-things', vibe: ['productive'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['overwhelmed', 'restless', 'stuck'],
    text: () => `Put 10 things back where they actually belong. Count them out loud. At 10, you're finished — walk away.`,
  },
  {
    id: 'trash-now', vibe: ['productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['procrastinating', 'stuck'],
    text: () => `Take out the trash and recycling right now, before you sit back down. That's it. That's the whole win.`,
  },
  {
    id: 'prep-tomorrow', vibe: ['productive', 'calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['evening', 'night'],
    tags: ['procrastinating', 'anxious'],
    text: () => `Spend 5 minutes setting up tomorrow's first move: lay out clothes, pack your bag, or put one thing by the door. Future-you does the rest.`,
  },

  // ---------- social ----------
  {
    id: 'text-old-friend', vibe: ['calm', 'productive'], energy: ['low'], social: 'social',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['lonely', 'numb', 'scrolling'],
    text: () => `Text someone you haven't spoken to in months. Two words is enough: "thinking of you." Send it before you talk yourself out of it.`,
  },
  {
    id: 'call-one-question', vibe: ['calm'], energy: ['medium'], social: 'social',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['lonely', 'stuck'],
    text: () => `Call a friend or family member and ask them one real question you actually want the answer to. Let them talk. 10 minutes is plenty.`,
  },
  {
    id: 'be-around-people', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'social',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['day', 'evening'], needsOpen: true,
    tags: ['lonely', 'scrolling', 'isolated'],
    text: (ctx) => {
      const p = ctx.nearby(['cafe', 'park', 'library', 'eatery']);
      const where = p ? `${p.name} (about ${p.minutes} min away)` : 'a cafe, park, or library';
      return `Go to ${where} and just be around other people for ${U.int(20, 30)} minutes. You don't have to talk to anyone. Proximity counts.`;
    },
  },
  {
    id: 'compliment-stranger', vibe: ['adventurous'], energy: ['medium', 'high'], social: 'social',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['stuck', 'numb', 'bold'],
    text: () => `Next time you're near a stranger today, give one genuine, specific compliment out loud. Then walk on. No follow-up needed.`,
  },

  // ---------- high energy / movement ----------
  {
    id: 'fast-walk', vibe: ['adventurous', 'productive'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['wired', 'restless', 'stuck'],
    text: (ctx) => `Walk as fast as you comfortably can for ${dur(ctx, 10, 20)} minutes with no destination. Push the pace until your breathing changes.`,
  },
  {
    id: 'reps-now', vibe: ['productive'], energy: ['high'], social: 'either',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['wired', 'restless', 'numb'],
    text: () => { const move = U.pick(['push-ups', 'squats', 'jumping jacks', 'lunges']); return `Do ${U.int(15, 30)} ${move} right now, wherever you're standing. Go until it's slightly hard, then stop.`; },
  },
  {
    id: 'two-songs-dance', vibe: ['creative', 'adventurous'], energy: ['high'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['numb', 'wired', 'sad'],
    text: () => `Put on exactly 2 songs you love and dance to both at full effort. No half-measures, no audience. Stop when the second song ends.`,
  },
  {
    id: 'jog-landmark', vibe: ['adventurous'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['wired', 'restless'],
    text: () => `Pick a visible landmark a few minutes away. Jog or briskly walk to it and back. The landmark is the whole goal.`,
  },
  {
    id: 'stairs', vibe: ['productive'], energy: ['high'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['wired', 'restless'],
    text: () => `Find the nearest set of stairs and go up and down them for ${U.int(5, 8)} minutes. Count the flights. That's the metric.`,
  },

  // ---------- night-appropriate ----------
  {
    id: 'find-moon', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['night', 'evening'],
    tags: ['scrolling', 'restless', 'cant-sleep'],
    text: () => `Step outside and find the moon. If it's hidden, find ${U.int(3, 5)} stars instead. Stay out until you've really looked, not just glanced.`,
  },
  {
    id: 'sit-dark', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['night'],
    tags: ['cant-sleep', 'wired', 'anxious'],
    text: () => `Turn off every light and sit in the dark for 5 minutes, eyes open, no phone. Let your eyes adjust and just notice the room reappear.`,
  },
  {
    id: 'night-walk-windows', vibe: ['calm', 'adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['night', 'evening'],
    tags: ['scrolling', 'restless', 'cant-sleep'],
    text: (ctx) => `Take a slow ${dur(ctx, 10, 20)}-minute walk around the block. Notice the lit windows and imagine, briefly, the life behind one of them.`,
  },

  // ---------- weather-triggered (only surface in matching conditions) ----------
  {
    id: 'rain-walk', vibe: ['adventurous', 'calm'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    weatherOnly: ['wet'], tags: ['stuck', 'numb', 'scrolling'],
    text: () => `It's raining — use it. Put on a jacket and walk for 10 minutes in it on purpose. Notice the smell of the wet ground and the sound on your hood.`,
  },
  {
    id: 'snow-stand', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    weatherOnly: ['snow'], tags: ['stuck', 'numb', 'scrolling'],
    text: () => `It's snowing. Step outside and stand in it for 5 minutes. Catch one flake, watch how the light changes, then come back in and warm up.`,
  },
  {
    id: 'golden-hour', vibe: ['calm', 'creative'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    weatherOnly: ['clear'], needsLight: true, tags: ['scrolling', 'numb', 'stuck'],
    text: () => `The sky's clear. Get outside for 10 minutes while the light's good — face the sun, walk a little, and don't bring a destination.`,
  },

  // ============================================================
  //  EXPANDED SET — more of every category, heaviest on outdoor.
  // ============================================================

  // ---------- outdoor · calm / restorative ----------
  {
    id: 'cloud-watch', vibe: ['calm', 'creative'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day'], needsLight: true,
    tags: ['scrolling', 'overstimulated', 'tired'],
    text: () => `Find a patch of grass or a bench, lie back or look up, and watch the clouds for 10 minutes. Find ${U.int(2, 4)} shapes in them. Nothing else.`,
  },
  {
    id: 'barefoot-grass', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 5, daypart: ['day', 'evening'], needsLight: true,
    tags: ['anxious', 'numb', 'wired'],
    text: () => `Find the nearest grass, sand, or bare earth. Take your shoes off and just stand on it for 3 minutes. Notice the temperature and texture under your feet.`,
  },
  {
    id: 'tree-back', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['overwhelmed', 'anxious', 'numb'],
    text: () => `Walk to the nearest tree you can sit under. Put your back against the trunk and stay there for ${U.int(8, 12)} minutes. Let it hold you up.`,
  },
  {
    id: 'bird-count', vibe: ['calm'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day'], needsLight: true,
    tags: ['scrolling', 'bored', 'numb'],
    text: () => `Go outside and count how many distinct birds you can spot or hear in 10 minutes. Try to notice ${U.int(3, 5)} different kinds.`,
  },
  {
    id: 'bench-new', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['stuck', 'scrolling', 'restless'],
    text: () => `Find a bench, step, or low wall you've never sat on before. Sit there for 10 minutes and watch the world go by from this new angle.`,
  },
  {
    id: 'sit-people-watch', vibe: ['calm', 'creative'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['lonely', 'bored', 'numb'],
    text: () => `Sit somewhere public for 10 minutes and quietly invent a plausible backstory for ${U.int(1, 2)} stranger(s) who walk past. Keep it kind.`,
  },

  // ---------- outdoor · creative ----------
  {
    id: 'color-hunt-walk', vibe: ['creative', 'adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'], needsLight: true,
    tags: ['scrolling', 'bored', 'stuck'],
    text: (ctx) => { const c = U.pick(['red', 'blue', 'yellow', 'green', 'something orange', 'something purple']); return `Walk for ${dur(ctx, 12, 18)} minutes and find ${U.int(5, 7)} things that are ${c}. Photograph them or just collect them with your eyes.`; },
  },
  {
    id: 'shadow-photos', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day'], needsLight: true,
    tags: ['scrolling', 'bored'],
    text: () => `Walk for 10 minutes photographing only shadows — yours, trees, railings, whatever. Get ${U.int(5, 8)} of them. Stop looking at the objects, look at what they cast.`,
  },
  {
    id: 'doors-photos', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'], needsLight: true,
    tags: ['bored', 'stuck'],
    text: () => `Take a 12-minute walk and photograph ${U.int(4, 6)} doors that catch your eye — old, painted, odd, beautiful. Notice how different they all are.`,
  },
  {
    id: 'sketch-outside', vibe: ['creative', 'calm'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day'], needsLight: true,
    tags: ['bored', 'scrolling', 'stuck'],
    text: () => `Take paper and a pen outside. Sit somewhere and spend 10 minutes sketching one building, tree, or view. It only has to be for you.`,
  },
  {
    id: 'found-poem-signs', vibe: ['creative'], energy: ['medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'],
    tags: ['bored', 'numb', 'stuck'],
    text: () => `Walk for 12 minutes and build a short poem out of words you read on signs, shops, and posters along the way. Say the final version out loud.`,
  },
  {
    id: 'collect-three', vibe: ['creative', 'calm'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day'], needsLight: true,
    tags: ['bored', 'numb', 'scrolling'],
    text: () => `Walk outside and collect 3 small natural objects that catch your eye — a leaf, a stone, a seed pod. Bring them home and put them somewhere you'll see them.`,
  },

  // ---------- outdoor · adventurous / exploration ----------
  {
    id: 'follow-your-nose', vibe: ['adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['bored', 'stuck', 'autopilot'],
    text: (ctx) => `Walk out the door and at every corner, turn toward whatever looks more interesting. Do this for ${Math.floor(dur(ctx, 15, 25) / 2)} minutes, then find your way back.`,
  },
  {
    id: 'highest-point', vibe: ['adventurous'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day', 'evening'],
    tags: ['restless', 'wired', 'stuck'],
    text: () => `Find the highest spot you can reach on foot nearby — a hill, a bridge, a parking deck's top level — and go look at the view from up there.`,
  },
  {
    id: 'public-art-hunt', vibe: ['adventurous', 'creative'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['bored', 'stuck', 'scrolling'],
    text: () => `Go find one piece of public art you've never really looked at — a mural, a statue, a painted wall. Stand with it for 2 minutes before you head back.`,
  },
  {
    id: 'scavenger-neighborhood', vibe: ['adventurous', 'creative'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'], needsLight: true,
    tags: ['bored', 'stuck', 'scrolling'],
    text: () => { const items = U.sample(['a red door', 'a cat', 'something heart-shaped', 'a number 7', 'a flower growing through concrete', 'a hand-written sign', 'a blue bicycle', 'a gargoyle or face on a building'], 4); return `Mini scavenger hunt — go find all of these on a walk: ${items.join(', ')}. Come back when you've got them all.`; },
  },
  {
    id: 'window-shopping', vibe: ['adventurous', 'calm'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['bored', 'stuck', 'scrolling'],
    text: () => `Wander a shopping street or row of stores for 15 minutes with a rule: buy nothing. Just window-shop and note the one thing you'd come back for.`,
  },
  {
    id: 'market-wander', vibe: ['adventurous', 'calm'], energy: ['medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day'], needsOpen: true,
    tags: ['bored', 'stuck', 'lonely'],
    text: () => `Go to a market, farm stand, or food hall and wander it slowly. Buy one small thing you've never tried, or nothing at all. The wandering is the point.`,
  },
  {
    id: 'park-laps', vibe: ['productive', 'adventurous'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['wired', 'restless', 'stuck'],
    text: (ctx) => { const p = ctx.nearby(['park']); const where = p ? `${p.name} (about ${p.minutes} min away)` : 'the nearest park or open green space'; return `Go to ${where} and walk a full loop of it ${U.int(2, 3)} times without stopping. Let your thoughts loosen as you go.`; },
  },
  {
    id: 'count-steps-landmark', vibe: ['adventurous', 'productive'], energy: ['medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'],
    tags: ['bored', 'stuck', 'restless'],
    text: () => `Pick a landmark you can see or know nearby. Walk to it counting your steps the whole way. Report the number to no one — it's just a reason to move.`,
  },

  // ---------- outdoor · movement / high energy ----------
  {
    id: 'hill-walk-fast', vibe: ['productive', 'adventurous'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'],
    tags: ['wired', 'restless', 'numb'],
    text: () => `Find any hill, ramp, or incline nearby. Walk up it as briskly as you can ${U.int(3, 5)} times, strolling back down to recover between. Then head home.`,
  },
  {
    id: 'shadow-box-outside', vibe: ['adventurous', 'productive'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['wired', 'angry', 'restless'],
    text: () => `Get to an open outdoor spot and shadow-box ${U.int(2, 3)} rounds of 1 minute — throw real punches at the air. Shake out your arms after each round.`,
  },
  {
    id: 'evening-stroll-nophone', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['evening'],
    tags: ['scrolling', 'restless', 'wired'],
    text: (ctx) => `Leave your phone at home and take a slow ${dur(ctx, 15, 25)}-minute stroll with no goal. Let the after-work part of the day actually end.`,
  },

  // ---------- outdoor · social ----------
  {
    id: 'walk-and-call', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'social',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['lonely', 'restless', 'stuck'],
    text: () => `Call someone you like and go for a walk while you talk to them. Move and connect at the same time — aim for at least 15 minutes outside.`,
  },
  {
    id: 'invite-a-walk', vibe: ['adventurous', 'productive'], energy: ['medium'], social: 'social',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day', 'evening'],
    tags: ['lonely', 'stuck', 'isolated'],
    text: () => `Text someone nearby right now: "Walk? Leaving in 10." If they can't, go anyway. The ask is the brave part.`,
  },
  {
    id: 'dog-spotting', vibe: ['calm', 'adventurous'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['lonely', 'numb', 'sad'],
    text: () => `Go for a short walk and count the dogs you see. If it feels right, ask one owner "can I say hi?" and give the dog 30 seconds of pure attention.`,
  },

  // ---------- outdoor · night ----------
  {
    id: 'stargaze', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['night'],
    tags: ['scrolling', 'cant-sleep', 'restless'],
    text: () => `Get to the darkest spot you can reach nearby and look up for 10 minutes. Try to trace ${U.int(1, 3)} shapes between the stars. Let your eyes adjust first.`,
  },
  {
    id: 'night-air', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['night', 'evening'],
    tags: ['cant-sleep', 'wired', 'anxious'],
    text: () => `Step outside into the night air and just stand there for 5 minutes. Take ${U.int(5, 8)} slow breaths and notice the temperature on your skin and the quiet.`,
  },
  {
    id: 'moon-photo', vibe: ['creative', 'calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['night', 'evening'],
    tags: ['scrolling', 'cant-sleep', 'numb'],
    text: () => `Go outside and try to photograph the night — the moon, a streetlight halo, lit windows. Get one shot you actually like, then put the phone away.`,
  },

  // ---------- indoor · calm ----------
  {
    id: 'candle-watch', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['evening', 'night'],
    tags: ['anxious', 'wired', 'cant-sleep'],
    text: () => `Light a candle (or turn on one small lamp) and watch the flame or glow for 5 minutes in an otherwise dim room. Let your eyes go soft.`,
  },
  {
    id: 'tea-slow', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['overstimulated', 'tired', 'scrolling'],
    text: () => `Make a cup of tea or coffee as slowly as you possibly can — every step deliberate. Then drink it doing absolutely nothing else.`,
  },
  {
    id: 'stretch-floor', vibe: ['calm', 'productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['tired', 'wired', 'restless'],
    text: () => `Get on the floor and stretch for 10 minutes with no routine — just follow whatever your body asks for. Hold each stretch for a few slow breaths.`,
  },
  {
    id: 'one-song-eyes-closed', vibe: ['calm', 'creative'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['numb', 'sad', 'overstimulated'],
    text: () => `Play one song you love, lie down, close your eyes, and do nothing but listen to it the whole way through. No phone, no second screen.`,
  },
  {
    id: 'warm-shower-reset', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['evening', 'night'],
    tags: ['numb', 'tired', 'cant-sleep'],
    text: () => `Take a deliberately slow warm shower. The only job is to feel the water and the warmth — no planning, no rehearsing conversations.`,
  },

  // ---------- indoor · creative ----------
  {
    id: 'handwrite-letter', vibe: ['creative', 'calm'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening', 'night'],
    tags: ['lonely', 'numb', 'stuck'],
    text: () => `Handwrite a letter to someone — living or not, sending or not. Fill one side of a page. You decide afterward whether it ever leaves the room.`,
  },
  {
    id: 'origami-fold', vibe: ['creative'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['bored', 'restless', 'scrolling'],
    text: () => { const thing = U.pick(['paper airplane', 'paper boat', 'paper crane', 'paper fortune-teller']); return `Fold a ${thing} from memory using any paper nearby. Then actually fly it, float it, or use it. Bonus points if it's terrible.`; },
  },
  {
    id: 'blind-contour', vibe: ['creative'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['bored', 'scrolling', 'stuck'],
    text: () => `Draw your own face (use a mirror) or your hand WITHOUT looking at the paper, in one continuous line. 5 minutes. The weirder it comes out, the better.`,
  },
  {
    id: 'three-good-things', vibe: ['calm', 'creative'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['evening', 'night'],
    tags: ['sad', 'numb', 'anxious'],
    text: () => `Write down 3 small good things from today — specific ones, not "I'm grateful for my family." Like "the first sip of coffee" specific.`,
  },
  {
    id: 'ten-tiny-wants', vibe: ['creative', 'productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['stuck', 'numb', 'bored'],
    text: () => `Write a list of 10 tiny things you want — a nap, a specific snack, to repaint a wall, anything. Don't judge them. Just surface them.`,
  },

  // ---------- indoor · productive (single, bounded) ----------
  {
    id: 'make-bed', vibe: ['productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day'],
    tags: ['procrastinating', 'overwhelmed', 'numb'],
    text: () => `Make your bed properly — pull the sheets tight, fluff the pillows, the whole thing. One made bed can reset a whole room. Then stop.`,
  },
  {
    id: 'one-window', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['restless', 'stuck', 'procrastinating'],
    text: () => `Clean exactly ONE window or mirror until it's properly clear. Just one. Notice how much more light comes through, then leave the rest.`,
  },
  {
    id: 'water-plants', vibe: ['productive', 'calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['numb', 'procrastinating', 'tired'],
    text: () => `Water every plant you own, and pull off any dead leaves while you're there. If you have none, wipe the dust off one houseplant-shaped corner of your life instead.`,
  },
  {
    id: 'one-load-laundry', vibe: ['productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['procrastinating', 'overwhelmed', 'stuck'],
    text: () => `Start ONE load of laundry right now — gather, load, start it. That's the whole task. Future-you deals with the rest.`,
  },
  {
    id: 'tidy-entryway', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['overwhelmed', 'restless', 'procrastinating'],
    text: () => `Reset just your entryway: line up the shoes, hang what's fallen, clear the surface by the door. The spot you see first should greet you well.`,
  },
  {
    id: 'prep-veg', vibe: ['productive', 'creative'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['procrastinating', 'bored'],
    text: () => `Wash and chop whatever vegetables or fruit you have, and put them where you'll see them. Make the healthy choice the lazy choice for tomorrow.`,
  },

  // ---------- indoor · movement / high energy ----------
  {
    id: 'tabata-bodyweight', vibe: ['productive'], energy: ['high'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['wired', 'restless', 'numb'],
    text: () => { const m = U.pick(['squats', 'push-ups', 'high knees', 'mountain climbers', 'burpees']); return `Do 4 rounds: 30 seconds of ${m} as hard as you can, 30 seconds rest. That's 4 minutes of actual effort. Go.`; },
  },
  {
    id: 'clean-to-a-song', vibe: ['productive'], energy: ['high'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['restless', 'wired', 'overwhelmed'],
    text: () => `Put on one upbeat song and race to tidy as much of one room as you can before it ends. When the song stops, you stop. Turn it up loud.`,
  },

  // ---------- social (indoor / remote) ----------
  {
    id: 'voice-note-friend', vibe: ['calm', 'creative'], energy: ['low'], social: 'social',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['lonely', 'numb', 'scrolling'],
    text: () => `Send a friend a 1-minute voice note instead of a text — just ramble about your day or something you saw. Your voice carries more than typing does.`,
  },
  {
    id: 'thank-someone', vibe: ['calm', 'productive'], energy: ['low'], social: 'social',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['lonely', 'sad', 'numb'],
    text: () => `Message one person a specific thank-you — not "thanks for everything" but "thank you for [the exact thing]." Be concrete. Send it now.`,
  },
  {
    id: 'ask-a-rec', vibe: ['creative', 'calm'], energy: ['low'], social: 'social',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['lonely', 'bored', 'stuck'],
    text: () => `Text someone: "Give me one ${U.pick(['song', 'book', 'movie', 'recipe', 'podcast episode'])} I'd never find on my own." Asking is a small, warm kind of contact.`,
  },
  {
    id: 'coffee-invite', vibe: ['adventurous'], energy: ['medium'], social: 'social',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'], needsOpen: true,
    tags: ['lonely', 'isolated', 'stuck'],
    text: (ctx) => { const p = ctx.nearby(['cafe', 'eatery']); const where = p ? ` Suggest ${p.name} (about ${p.minutes} min away).` : ''; return `Text someone "free for a quick coffee?" and actually mean now or soon.${where} Worst case they say no and you've lost nothing.`; },
  },

  // ---------- weather-triggered (extra conditions) ----------
  {
    id: 'fog-walk', vibe: ['calm', 'adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    weatherOnly: ['fog'], tags: ['scrolling', 'numb', 'stuck'],
    text: () => `It's foggy — the world's gone soft and strange. Walk into it for 10 minutes and notice how sound and distance change. Everything looks like a photograph.`,
  },
  {
    id: 'cold-brisk', vibe: ['adventurous', 'productive'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    weatherOnly: ['cold'], tags: ['numb', 'tired', 'wired'],
    text: () => `It's properly cold. Bundle up, walk briskly for 10 minutes, and feel your body wake up — then come back to something warm. The contrast is the reward.`,
  },
  {
    id: 'heat-shade-drink', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day'],
    weatherOnly: ['hot'], tags: ['tired', 'overstimulated', 'stuck'],
    text: () => `It's hot out. Get a cold drink, find the best patch of shade you can reach, and sit in it for 10 minutes doing nothing. Let the heat slow you all the way down.`,
  },
  {
    id: 'sunset-watch', vibe: ['calm', 'creative'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['evening'],
    weatherOnly: ['clear'], tags: ['scrolling', 'numb', 'restless'],
    text: () => `Sky's clear and the light's about to turn gold. Get somewhere with a view west and actually watch the sunset happen — start to finish, no phone.`,
  },

  // ============================================================
  //  SEASONAL SET (50) — gated to the right season, and the truly
  //  condition-dependent ones also gate on live weather/temp so an
  //  impossible suggestion (a snowman in July) never surfaces.
  // ============================================================

  // ---------- winter (13) ----------
  {
    id: 'win-snowman', vibe: ['creative', 'adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    seasons: ['winter'], weatherOnly: ['snow'], tags: ['bored', 'stuck', 'numb'],
    text: () => { const w = U.pick(['a snowman', 'a snow fort', 'a snow creature of your own invention', 'the biggest snowball you can roll']); return `There's snow out there — go build ${w}. Get your hands cold. It doesn't have to last.`; },
  },
  {
    id: 'win-snow-angel', vibe: ['calm', 'creative'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    seasons: ['winter'], weatherOnly: ['snow'], tags: ['numb', 'wired', 'sad'],
    text: () => `Find a patch of fresh snow, lie back, and make a snow angel. Stay down a moment and look straight up while you're there.`,
  },
  {
    id: 'win-snowflake-look', vibe: ['calm', 'creative'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    seasons: ['winter'], weatherOnly: ['snow'], tags: ['scrolling', 'overstimulated', 'numb'],
    text: () => `Step out and catch falling snowflakes on a dark sleeve or glove. Look at the actual crystals for a few seconds before they vanish.`,
  },
  {
    id: 'win-fresh-tracks', vibe: ['adventurous', 'calm'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    seasons: ['winter'], weatherOnly: ['snow'], tags: ['bored', 'restless', 'stuck'],
    text: () => `Go be the first to leave footprints in untouched snow. Walk a clean line across it and look back at what you made.`,
  },
  {
    id: 'win-sled', vibe: ['adventurous'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day', 'evening'],
    seasons: ['winter'], weatherOnly: ['snow'], tags: ['wired', 'restless', 'bored'],
    text: () => `Find a hill and slide down it ${U.int(3, 6)} times — sled, tray, flattened box, whatever you've got. Trudging back up is part of the deal.`,
  },
  {
    id: 'win-shovel', vibe: ['productive'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening'],
    seasons: ['winter'], weatherOnly: ['snow'], tags: ['procrastinating', 'restless', 'stuck'],
    text: () => `Shovel your walk or steps clear — and if you've a neighbour who'd struggle, do a stretch of theirs too. Quiet, useful work.`,
  },
  {
    id: 'win-frost-photos', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day'],
    seasons: ['winter'], maxTemp: 2, needsLight: true, tags: ['scrolling', 'bored', 'numb'],
    text: () => `It's freezing — go photograph frost. Find ${U.int(4, 6)} patterns on windows, leaves, or railings before the sun melts them.`,
  },
  {
    id: 'win-breath-clouds', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    seasons: ['winter'], maxTemp: 6, tags: ['numb', 'tired', 'wired'],
    text: () => `Step outside into the cold and breathe out slowly, watching your breath cloud and disappear. Do it until it stops being a novelty.`,
  },
  {
    id: 'win-cocoa-out', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    seasons: ['winter'], tags: ['scrolling', 'tired', 'numb'],
    text: () => `Make cocoa or a hot drink, bundle up properly, and drink it standing outside in the cold. The contrast is the whole point.`,
  },
  {
    id: 'win-evergreen-hunt', vibe: ['calm', 'creative'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'],
    seasons: ['winter'], tags: ['numb', 'bored', 'scrolling'],
    text: () => `Walk and find the things still alive in winter — evergreens, holly, berries, moss. Bring one small sprig home and put it in water.`,
  },
  {
    id: 'win-early-dark-walk', vibe: ['calm', 'adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['evening'],
    seasons: ['winter'], tags: ['scrolling', 'restless', 'lonely'],
    text: (ctx) => `It gets dark early now — lean into it. Take a ${dur(ctx, 12, 20)}-minute walk past the lit windows and string lights and let winter be cosy, not grim.`,
  },
  {
    id: 'win-warm-bake', vibe: ['creative', 'calm'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 20, daypart: ['day', 'evening', 'night'],
    seasons: ['winter'], tags: ['bored', 'numb', 'lonely'],
    text: () => `Bake or roast something warm — bread, cookies, a tray of vegetables. Let the smell and the oven heat fill the place while it's cold out.`,
  },
  {
    id: 'win-citrus', vibe: ['creative', 'calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    seasons: ['winter'], tags: ['scrolling', 'numb', 'tired'],
    text: () => `It's peak citrus season. Eat an orange or clementine impossibly slowly, segment by segment — or stud one with cloves and let the room smell of it.`,
  },

  // ---------- spring (12) ----------
  {
    id: 'spr-first-bud', vibe: ['calm', 'creative'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    seasons: ['spring'], needsLight: true, tags: ['scrolling', 'numb', 'stuck'],
    text: () => { const t = U.pick(['the first buds on a bare branch', 'the first blossom', 'green shoots pushing up through soil', 'the first wildflower']); return `Spring's starting — go find ${t}. Crouch down and really look at how brand-new it is.`; },
  },
  {
    id: 'spr-blossom-photos', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day'],
    seasons: ['spring'], needsLight: true, tags: ['scrolling', 'bored'],
    text: () => `Walk and photograph blossom and new leaves — ${U.int(5, 7)} shots. It only lasts a couple of weeks; catch it now.`,
  },
  {
    id: 'spr-plant-seed', vibe: ['creative', 'productive'], energy: ['low', 'medium'], social: 'either',
    budget: 'low', env: 'either', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    seasons: ['spring'], tags: ['stuck', 'numb', 'bored'],
    text: () => `Plant a seed or a herb in a pot — basil, a bean, anything. Put it on a sill where you'll watch it. Spring's the season to start things.`,
  },
  {
    id: 'spr-air-out', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day'],
    seasons: ['spring'], tags: ['overwhelmed', 'tired', 'numb'],
    text: () => `Throw open every window for 10 minutes and let the stale winter air pour out. Strip and shake out a blanket while it airs.`,
  },
  {
    id: 'spr-puddle-jump', vibe: ['adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    seasons: ['spring'], weatherOnly: ['wet'], tags: ['stuck', 'numb', 'bored'],
    text: () => `Spring rain's about. Put on the right shoes and go jump in or over puddles like you're eight years old. No one's watching that matters.`,
  },
  {
    id: 'spr-birdsong', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 10, daypart: ['day'],
    seasons: ['spring'], tags: ['anxious', 'scrolling', 'overstimulated'],
    text: () => `Step outside and just listen for the spring birdsong. See if you can pick out ${U.int(3, 5)} different birds calling.`,
  },
  {
    id: 'spr-kite', vibe: ['adventurous', 'creative'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day'],
    seasons: ['spring'], needsLight: true, tags: ['bored', 'restless', 'stuck'],
    text: () => `If there's any breeze at all, fly a kite — a real one or one you fold from paper in 2 minutes. Run with it until it catches.`,
  },
  {
    id: 'spr-garden-prep', vibe: ['productive'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening'],
    seasons: ['spring'], tags: ['restless', 'procrastinating', 'stuck'],
    text: () => `Clear and turn over one garden bed or set of pots, ready for planting. Pull the dead winter stuff; make room for what's next.`,
  },
  {
    id: 'spr-forage-walk', vibe: ['adventurous', 'calm'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day'],
    seasons: ['spring'], needsLight: true, tags: ['bored', 'stuck', 'numb'],
    text: () => `Take a slow walk and notice the new green coming up everywhere — name what you can, photograph what you can't. (Admire only; don't eat anything you can't identify.)`,
  },
  {
    id: 'spr-picnic-first-warm', vibe: ['calm'], energy: ['low', 'medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day'],
    seasons: ['spring'], minTemp: 14, tags: ['lonely', 'tired', 'stuck'],
    text: () => `It's finally warm enough — take a snack outside and sit right on the ground somewhere green for 20 minutes. The first one of the year always feels like something.`,
  },
  {
    id: 'spr-spring-clean', vibe: ['productive'], energy: ['medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening'],
    seasons: ['spring'], tags: ['overwhelmed', 'restless', 'procrastinating'],
    text: () => `Pick one shelf, closet, or cupboard you've ignored all winter and deep-clean just that. Spring-clean a single square metre, then stop.`,
  },
  {
    id: 'spr-rain-smell', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    seasons: ['spring'], weatherOnly: ['wet'], tags: ['anxious', 'overstimulated', 'scrolling'],
    text: () => `Step out into the spring rain (or just after it) and breathe in that smell on purpose for a few minutes. There's a word for loving it: petrichor.`,
  },

  // ---------- summer (13) ----------
  {
    id: 'sum-cooloff', vibe: ['adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['day', 'evening'],
    seasons: ['summer'], minTemp: 24, tags: ['wired', 'restless', 'overstimulated'],
    text: () => `It's hot — go find water and get in it. Swim, wade, or just dunk your feet somewhere cool for 10 minutes. Let the heat be a reason, not a complaint.`,
  },
  {
    id: 'sum-fireflies', vibe: ['calm', 'creative'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['night'],
    seasons: ['summer'], tags: ['scrolling', 'restless', 'cant-sleep'],
    text: () => `Go out into the warm dark and watch for fireflies or night insects. Sit still and let your eyes adjust — they come to the patient.`,
  },
  {
    id: 'sum-cold-treat', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    seasons: ['summer'], tags: ['tired', 'bored', 'scrolling'],
    text: () => `Get an ice cream or popsicle and eat it walking slowly outside before it melts down your hand. Pure summer, no agenda.`,
  },
  {
    id: 'sum-early-walk', vibe: ['adventurous', 'productive'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day'],
    seasons: ['summer'], tags: ['wired', 'restless', 'stuck'],
    text: (ctx) => `Beat the heat — get a ${dur(ctx, 15, 25)}-minute walk in while the air's still cool and the day hasn't fully started yet.`,
  },
  {
    id: 'sum-grass-stars', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['evening', 'night'],
    seasons: ['summer'], tags: ['scrolling', 'restless', 'cant-sleep'],
    text: () => `Lie in the grass as the summer light fades and wait for the first stars to come out. Stay until you've counted ${U.int(3, 6)} of them.`,
  },
  {
    id: 'sum-sprinkler', vibe: ['adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day'],
    seasons: ['summer'], minTemp: 26, tags: ['wired', 'numb', 'bored'],
    text: () => `It's properly hot. Run through a sprinkler, hose your feet down, or splash cold water over your head outside. Be undignified about it.`,
  },
  {
    id: 'sum-berry-pick', vibe: ['adventurous', 'calm'], energy: ['medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day'],
    seasons: ['summer'], needsOpen: true, tags: ['bored', 'lonely', 'stuck'],
    text: () => `Go pick berries, or buy a punnet from a stand, and eat a few while they're still warm from the sun. Summer doesn't taste like much else.`,
  },
  {
    id: 'sum-hammock-read', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening'],
    seasons: ['summer'], tags: ['tired', 'overstimulated', 'scrolling'],
    text: () => `Take a book to a hammock, a shady patch of grass, or a porch chair and read for 15 minutes in the open air. No phone within reach.`,
  },
  {
    id: 'sum-water-eve', vibe: ['productive', 'calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['evening'],
    seasons: ['summer'], tags: ['tired', 'numb', 'restless'],
    text: () => `Water the garden or your plants in the cool of the evening, when it actually helps them. Smell the wet earth after.`,
  },
  {
    id: 'sum-eat-outside', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening'],
    seasons: ['summer'], tags: ['scrolling', 'lonely', 'numb'],
    text: () => `Take your next meal or snack outside and eat it there — step, balcony, grass, kerb. Summer food tastes better in the open.`,
  },
  {
    id: 'sum-sunrise', vibe: ['calm', 'adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day'],
    seasons: ['summer'], tags: ['cant-sleep', 'stuck', 'numb'],
    text: () => `Catch a summer sunrise. It's early and a bit mad, but get somewhere with an open east view and watch the whole thing once this year.`,
  },
  {
    id: 'sum-storm-watch', vibe: ['calm', 'creative'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    seasons: ['summer'], weatherOnly: ['thunder'], tags: ['anxious', 'wired', 'overstimulated'],
    text: () => `There's a storm. Watch it safely from a porch or open doorway — count the seconds between each flash and its thunder to gauge how far off it is.`,
  },
  {
    id: 'sum-barefoot-cool', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['evening'],
    seasons: ['summer'], tags: ['wired', 'tired', 'overstimulated'],
    text: () => `After a hot day, stand barefoot on the cooling grass for a few minutes as the temperature drops. Let the day come down with it.`,
  },

  // ---------- autumn (12) ----------
  {
    id: 'aut-leaf-collect', vibe: ['calm', 'creative'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day'],
    seasons: ['autumn'], needsLight: true, tags: ['scrolling', 'numb', 'bored'],
    text: () => `Go collect the most colourful fallen leaves you can find — aim for ${U.int(4, 7)} different colours. Press the best one flat in a heavy book.`,
  },
  {
    id: 'aut-leaf-crunch', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    seasons: ['autumn'], tags: ['numb', 'bored', 'scrolling'],
    text: () => `Go find the crunchiest dry leaves and step on every single one for 10 minutes. It's stupid and it works.`,
  },
  {
    id: 'aut-leaf-pile', vibe: ['productive', 'adventurous'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 15, daypart: ['day'],
    seasons: ['autumn'], tags: ['wired', 'restless', 'stuck'],
    text: () => `Rake the fallen leaves into one big pile — and then, at least once, jump in it. Raking it back up afterward is allowed to be optional.`,
  },
  {
    id: 'aut-fall-colors', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day'],
    seasons: ['autumn'], needsLight: true, tags: ['scrolling', 'bored', 'numb'],
    text: () => `Walk and photograph the turning trees — find ${U.int(5, 7)} distinct shades of red, orange, and gold. The peak only lasts a week or two.`,
  },
  {
    id: 'aut-orchard', vibe: ['adventurous', 'calm'], energy: ['medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day'],
    seasons: ['autumn'], needsOpen: true, tags: ['bored', 'lonely', 'stuck'],
    text: () => `Go to an orchard, farm, or market for the season's haul — apples, cider, a pumpkin. Pick the ugliest, most interesting one.`,
  },
  {
    id: 'aut-acorns', vibe: ['calm', 'creative'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day'],
    seasons: ['autumn'], needsLight: true, tags: ['numb', 'bored', 'scrolling'],
    text: () => `Collect a pocketful of acorns, conkers, or seed pods on a walk. Line them up by size on a windowsill when you get home.`,
  },
  {
    id: 'aut-cozy-window', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    seasons: ['autumn'], tags: ['tired', 'scrolling', 'overstimulated'],
    text: () => `Make a hot drink, pull a chair to the window, and watch the leaves come down for 10 minutes. That's the whole autumn ritual.`,
  },
  {
    id: 'aut-early-sunset', vibe: ['calm', 'adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['evening'],
    seasons: ['autumn'], tags: ['scrolling', 'restless', 'numb'],
    text: () => `The sun sets earlier every day now. Go out and watch it happen on purpose instead of letting it slip past a window.`,
  },
  {
    id: 'aut-sweater-walk', vibe: ['calm'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    seasons: ['autumn'], maxTemp: 16, tags: ['tired', 'numb', 'stuck'],
    text: () => `First proper sweater weather — pull one on and take a 15-minute walk just to feel the crisp air on your face. Hands in pockets.`,
  },
  {
    id: 'aut-spice-bake', vibe: ['creative', 'calm'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 20, daypart: ['day', 'evening', 'night'],
    seasons: ['autumn'], tags: ['bored', 'numb', 'lonely'],
    text: () => `Bake something with cinnamon, ginger, or nutmeg and let the kitchen go warm and fragrant while it's grey outside. The smell does half the work.`,
  },
  {
    id: 'aut-foggy-morning', vibe: ['calm', 'adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day'],
    seasons: ['autumn'], weatherOnly: ['fog'], tags: ['scrolling', 'numb', 'stuck'],
    text: () => `Autumn fog — go walk in it while it lasts. Everything's muffled and half-erased; it won't look like this again for a while.`,
  },
  {
    id: 'aut-gather-warmth', vibe: ['calm', 'productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['evening', 'night'],
    seasons: ['autumn'], tags: ['tired', 'numb', 'overwhelmed'],
    text: () => `Dig out the blankets and warm socks and build one genuinely cosy corner for the season ahead. Light low and soft.`,
  },

  // ============================================================
  //  MORE GENERAL (100) — year-round, across every category,
  //  with a continued lean toward getting outside.
  // ============================================================

  // ---------- outdoor · calm (10) ----------
  {
    id: 'g-sky-colors', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['overstimulated', 'scrolling', 'anxious'],
    text: () => `Go outside, look up, and watch the sky for 10 minutes. Quietly name every distinct colour you can find in it.`,
  },
  {
    id: 'g-listen-layers', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['anxious', 'overstimulated', 'wired'],
    text: () => `Stand outside, close your eyes, and peel the sounds apart from nearest to farthest. Find the most distant one you can.`,
  },
  {
    id: 'g-slowest-walk', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['wired', 'overstimulated', 'scrolling'],
    text: () => `Take the slowest walk you possibly can for 10 minutes — half your normal pace. Notice ${U.int(5, 7)} small things you'd usually blow right past.`,
  },
  {
    id: 'g-touch-bark', vibe: ['calm', 'creative'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['numb', 'anxious', 'scrolling'],
    text: () => `Walk to 3 different trees and feel the bark of each with your eyes closed. Notice how completely different they are under your hand.`,
  },
  {
    id: 'g-quietest-spot', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['overstimulated', 'anxious', 'overwhelmed'],
    text: () => `Go hunt for the quietest outdoor spot you can reach in a few minutes. When you find it, sit and stay there for 10 minutes.`,
  },
  {
    id: 'g-face-the-wind', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['numb', 'wired', 'tired'],
    text: () => `Find where you can feel the wind and stand facing straight into it for 5 minutes. Let it push on you. Notice you're still standing.`,
  },
  {
    id: 'g-sunbeam-stand', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day'],
    needsLight: true, tags: ['tired', 'numb', 'sad'],
    text: () => `Find a patch of sunlight and stand in it for a few minutes, eyes closed, face tipped up. Just take the warmth.`,
  },
  {
    id: 'g-water-edge', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['overwhelmed', 'numb', 'stuck'],
    text: (ctx) => { const p = ctx.nearby(['water']); return p ? `Go to ${p.name} (about ${p.minutes} min away) and sit at the water's edge for 10 minutes. If there are stones, skip a few.` : `Find any water's edge you can reach — pond, river, fountain — and sit beside it for 10 minutes.`; },
  },
  {
    id: 'g-morning-step-out', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day'],
    tags: ['scrolling', 'tired', 'anxious'],
    text: () => `Before you touch a single screen, step outside and take 5 slow breaths of the morning air. Let that be the first thing, not the feed.`,
  },
  {
    id: 'g-watch-the-flow', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['overwhelmed', 'numb', 'stuck'],
    text: () => `Find a safe bench or step and watch traffic or people flow past like a river for 10 minutes. You don't have to be part of it right now.`,
  },

  // ---------- outdoor · creative (8) ----------
  {
    id: 'g-photo-reflections', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'],
    tags: ['scrolling', 'bored', 'numb'],
    text: () => `Walk for 12 minutes photographing only reflections — puddles, windows, chrome, water. Get ${U.int(5, 7)} good ones.`,
  },
  {
    id: 'g-frame-hands', vibe: ['creative'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day'],
    needsLight: true, tags: ['bored', 'scrolling', 'stuck'],
    text: () => `Compose 5 "photographs" using only your hands as a frame — no camera. Decide what to leave in and what to crop out of each.`,
  },
  {
    id: 'g-collect-sounds', vibe: ['creative'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['scrolling', 'bored', 'numb'],
    text: () => `Record 5 distinct ambient sounds on a short walk — a gate, gravel, birds, a bus. Keep the one that most sounds like today.`,
  },
  {
    id: 'g-leaf-rubbing', vibe: ['creative'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day'],
    needsLight: true, tags: ['bored', 'numb', 'scrolling'],
    text: () => `Take paper and a pencil outside and make rubbings of 3 textures — bark, a leaf, a manhole cover. Build a little collection of surfaces.`,
  },
  {
    id: 'g-color-gradient', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day'],
    needsLight: true, tags: ['scrolling', 'bored', 'stuck'],
    text: () => { const c = U.pick(['blue', 'green', 'red', 'yellow']); return `Photograph 6 ${c} things and line them up later from lightest to darkest. Make a gradient out of your neighbourhood.`; },
  },
  {
    id: 'g-gesture-sketch', vibe: ['creative'], energy: ['medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'],
    tags: ['bored', 'scrolling', 'stuck'],
    text: () => `Take paper outside and do 5 quick 30-second sketches of people or scenes. Speed over accuracy — capture the gesture, not the detail.`,
  },
  {
    id: 'g-cloud-story', vibe: ['creative', 'calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day'],
    needsLight: true, tags: ['bored', 'numb', 'scrolling'],
    text: () => `Pick one cloud and narrate out loud (or in your head) what it's slowly turning into as it drifts. Stay with it the whole way.`,
  },
  {
    id: 'g-architecture-detail', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'],
    tags: ['scrolling', 'bored', 'autopilot'],
    text: () => `Photograph 5 small building details on a familiar street you never actually look up at — a carving, a date stone, a worn step, an odd window.`,
  },

  // ---------- outdoor · adventurous / exploration (14) ----------
  {
    id: 'g-new-cafe-sit', vibe: ['adventurous', 'calm'], energy: ['low', 'medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'],
    needsOpen: true, tags: ['stuck', 'bored', 'lonely'],
    text: (ctx) => { const p = ctx.nearby(['cafe', 'eatery']); const w = p ? `${p.name} (about ${p.minutes} min away)` : `a café you've never tried`; return `Go sit in ${w} on your own. Order something you can't pronounce and just be there a while.`; },
  },
  {
    id: 'g-transit-random', vibe: ['adventurous'], energy: ['medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 60, daypart: ['day', 'evening'],
    needsOpen: true, tags: ['bored', 'stuck', 'restless'],
    text: () => `Hop on a bus or train going one direction, ride a few stops, get off somewhere you don't know, look around for 10 minutes, then make your way back.`,
  },
  {
    id: 'g-explore-alley', vibe: ['adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'],
    tags: ['bored', 'stuck', 'autopilot'],
    text: () => `Walk down a side street, lane, or alley you've always passed and never entered. See where it goes. Turn back when it stops being interesting.`,
  },
  {
    id: 'g-oldest-building', vibe: ['adventurous', 'creative'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['bored', 'stuck', 'scrolling'],
    text: () => `Go find the oldest building you can within a short walk. Guess its age and story while you stand in front of it; look up the truth later.`,
  },
  {
    id: 'g-viewpoint', vibe: ['adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day', 'evening'],
    tags: ['stuck', 'restless', 'overwhelmed'],
    text: () => `Get yourself to any high vantage point or overlook you can reach and just take in the whole view from up there for a few minutes.`,
  },
  {
    id: 'g-neighborhood-edge', vibe: ['adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day', 'evening'],
    tags: ['bored', 'restless', 'stuck'],
    text: () => `Walk until you hit the edge of your own neighbourhood — wherever it stops feeling like "yours" — then go one block past it, and turn back.`,
  },
  {
    id: 'g-different-park', vibe: ['adventurous', 'calm'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['day', 'evening'],
    tags: ['bored', 'stuck', 'numb'],
    text: (ctx) => { const p = ctx.nearby(['park']); return p ? `Go to ${p.name} (about ${p.minutes} min away) — a park you've never set foot in. Walk every path of it once.` : `Find a park you've never set foot in and go walk every path of it once.`; },
  },
  {
    id: 'g-cross-bridge', vibe: ['adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['stuck', 'restless', 'bored'],
    text: () => `Find a bridge or overpass and cross it on foot. Stop in the middle and look both ways down whatever it spans.`,
  },
  {
    id: 'g-thrift-weird', vibe: ['adventurous', 'creative'], energy: ['low', 'medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'],
    needsOpen: true, tags: ['bored', 'stuck', 'scrolling'],
    text: () => `Pop into a thrift or charity shop and hunt down the single weirdest object in there. You don't have to buy it — just find it.`,
  },
  {
    id: 'g-public-stairs', vibe: ['adventurous', 'productive'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['wired', 'restless', 'stuck'],
    text: () => `Find a long public staircase or a steep path nearby and climb it to the very top. Catch your breath up there and look back down.`,
  },
  {
    id: 'g-cemetery-walk', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day'],
    tags: ['overwhelmed', 'numb', 'stuck'],
    text: () => `Take a slow, respectful walk through an old cemetery. Find the oldest headstone you can read and stand with it for a moment.`,
  },
  {
    id: 'g-garden-visit', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day'],
    needsOpen: true, tags: ['stuck', 'numb', 'overwhelmed'],
    text: () => `Visit a botanical garden, greenhouse, or conservatory and wander it slowly. Find one plant you've never seen before and learn its name.`,
  },
  {
    id: 'g-scout-sunset-spot', vibe: ['adventurous', 'calm'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['evening'],
    tags: ['scrolling', 'restless', 'numb'],
    text: () => `Go scout and claim a new spot to watch the sunset from — a wall, a hill, a west-facing window ledge. Use it tonight if the timing's right.`,
  },
  {
    id: 'g-night-shops', vibe: ['adventurous'], energy: ['medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['evening'],
    needsOpen: true, tags: ['bored', 'lonely', 'restless'],
    text: () => `Wander an open-late shopping street or night market with a strict rule: buy nothing (or one small thing). Just move through the lights and noise.`,
  },

  // ---------- outdoor · movement / high energy (8) ----------
  {
    id: 'g-accelerate-walk', vibe: ['productive', 'adventurous'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'],
    tags: ['wired', 'restless', 'stuck'],
    text: () => `Start walking, and speed up a little at every block until you're almost jogging. Hold the top pace for one block, then ease back down.`,
  },
  {
    id: 'g-curb-balance', vibe: ['adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['bored', 'restless', 'numb'],
    text: () => `Walk a curb, kerb, or painted line like a tightrope, arms out. See how far you get without stepping off. Reset and beat it once.`,
  },
  {
    id: 'g-bench-circuit', vibe: ['productive'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['wired', 'restless', 'stuck'],
    text: () => `Find a sturdy park bench and do 3 rounds: 10 step-ups, 8 tricep dips, 8 incline push-ups. Walk a lap between rounds to recover.`,
  },
  {
    id: 'g-long-walk-30', vibe: ['adventurous', 'calm'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 30, daypart: ['day', 'evening'],
    tags: ['stuck', 'overwhelmed', 'restless'],
    text: () => `Walk for a full 30 minutes with no destination, no podcast, no call. Just you and the moving. Let your head sort itself out on the way.`,
  },
  {
    id: 'g-jog-one-song2', vibe: ['productive'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['wired', 'restless', 'numb'],
    text: () => `Put on one fast song you love and jog or run for exactly its length — no more, no less. When it ends, you're done.`,
  },
  {
    id: 'g-hilliest-route', vibe: ['adventurous'], energy: ['high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day', 'evening'],
    tags: ['wired', 'restless', 'stuck'],
    text: () => `Deliberately pick the hilliest route you can find nearby and take it. Let your legs and lungs actually feel like they did something.`,
  },
  {
    id: 'g-skip-count', vibe: ['adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['wired', 'numb', 'bored'],
    text: () => `Skip — actual childhood skipping, or a rope if you've got one — ${U.int(80, 120)} times. Try not to laugh. It's hard not to.`,
  },
  {
    id: 'g-walk-til-tired', vibe: ['productive'], energy: ['high'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day', 'evening'],
    tags: ['wired', 'restless', 'overwhelmed'],
    text: () => `Walk outward until you feel pleasantly, honestly tired — then turn around and come home. Let your body pick the distance.`,
  },

  // ---------- outdoor · social (5) ----------
  {
    id: 'g-neighbor-hello', vibe: ['calm', 'productive'], energy: ['low'], social: 'social',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['lonely', 'isolated', 'numb'],
    text: () => `Step outside and actually greet a neighbour — more than a nod. Learn their name, or use it if you already know it.`,
  },
  {
    id: 'g-meet-at-park', vibe: ['calm', 'adventurous'], energy: ['medium'], social: 'social',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'],
    tags: ['lonely', 'stuck', 'isolated'],
    text: (ctx) => { const p = ctx.nearby(['park']); const w = p ? `${p.name} (about ${p.minutes} min away)` : `the nearest park`; return `Text someone: "Meet me at ${w} in 30?" Even 20 minutes outside together counts for a lot.`; },
  },
  {
    id: 'g-group-walk', vibe: ['adventurous'], energy: ['medium'], social: 'social',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day', 'evening'],
    tags: ['lonely', 'isolated', 'stuck'],
    text: () => `Text 2 or 3 people at once: "Anyone want to walk in 30?" Whoever's in, you go. Whoever isn't, no harm done.`,
  },
  {
    id: 'g-small-kindness', vibe: ['calm', 'adventurous'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['numb', 'sad', 'stuck'],
    text: () => `On a short walk, do one small helpful thing for a stranger — hold a door, return a stray cart, give clear directions, let someone in. One.`,
  },
  {
    id: 'g-snack-invite', vibe: ['adventurous'], energy: ['low', 'medium'], social: 'social',
    budget: 'low', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day', 'evening'],
    tags: ['lonely', 'isolated', 'numb'],
    text: () => `Grab a snack or two coffees and text someone nearby to come eat it outside with you. Low stakes, real contact.`,
  },

  // ---------- outdoor · night (5) ----------
  {
    id: 'g-night-changed-walk', vibe: ['calm', 'adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['night'],
    tags: ['scrolling', 'restless', 'cant-sleep'],
    text: (ctx) => `Walk a route you know well, but after dark. Notice everything that feels different at night — the sounds, the emptiness, which windows are lit. ${dur(ctx, 12, 20)} minutes.`,
  },
  {
    id: 'g-porch-dark-sit', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 10, daypart: ['night'],
    tags: ['cant-sleep', 'wired', 'overstimulated'],
    text: () => `Sit outside in the dark for 10 minutes with your phone left inside. Let your eyes adjust until the night stops being just black.`,
  },
  {
    id: 'g-light-trails', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['night'],
    tags: ['scrolling', 'bored', 'cant-sleep'],
    text: () => `Photograph light at night — passing headlights, streetlamp halos, reflections on a wet road. Chase ${U.int(4, 6)} shots that look better than the real scene.`,
  },
  {
    id: 'g-night-sounds', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['night'],
    tags: ['cant-sleep', 'anxious', 'wired'],
    text: () => `Stand outside at night, eyes closed, and inventory every sound. Notice which ones only happen after dark.`,
  },
  {
    id: 'g-find-planet', vibe: ['calm', 'creative'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['night'],
    tags: ['scrolling', 'cant-sleep', 'numb'],
    text: () => `Go out and find the brightest "star" in the sky — it's often a planet. Fix where it is, and look up which one it was tomorrow.`,
  },

  // ---------- indoor · calm (10) ----------
  {
    id: 'g-progressive-relax', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['evening', 'night'],
    tags: ['anxious', 'wired', 'cant-sleep'],
    text: () => `Lie down and go through your body head to toe: tense each muscle group hard for 5 seconds, then let it go completely. Feel the difference.`,
  },
  {
    id: 'g-warm-soak', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 15, daypart: ['evening', 'night'],
    tags: ['tired', 'overstimulated', 'cant-sleep'],
    text: () => `Run a warm bath or just a foot soak. Get in and stay until the water starts to cool — no phone, no list, just the warmth.`,
  },
  {
    id: 'g-window-watch2', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['overstimulated', 'numb', 'scrolling'],
    text: () => `Pull a chair to a window and just watch the outside world for 10 minutes. No goal. Let things happen out there while you rest in here.`,
  },
  {
    id: 'g-self-massage', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['tired', 'wired', 'anxious'],
    text: () => `Give yourself a slow 5-minute massage — hands, the base of your skull, or your feet. Press where it's tight and breathe out into it.`,
  },
  {
    id: 'g-scent-pause', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['anxious', 'overstimulated', 'numb'],
    text: () => `Light a candle or incense, or brew something fragrant, then close your eyes and do nothing but smell it for a few minutes. Just the one sense.`,
  },
  {
    id: 'g-half-album', vibe: ['calm', 'creative'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening', 'night'],
    tags: ['numb', 'sad', 'overstimulated'],
    text: () => `Lie down and listen to half an album the whole way through, in order, doing nothing else. Albums were built to be heard like this.`,
  },
  {
    id: 'g-read-paper-10', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['scrolling', 'overstimulated', 'tired'],
    text: () => `Read 10 pages of a physical book — paper, not a screen. If you don't have one going, open any book to any page and start.`,
  },
  {
    id: 'g-bed-stretch', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['night'],
    tags: ['cant-sleep', 'wired', 'tired'],
    text: () => `Do 5 minutes of slow, gentle stretches on or beside your bed before sleep — knees to chest, a soft twist, reach for your toes. Breathe long and out.`,
  },
  {
    id: 'g-braindump', vibe: ['calm', 'productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['overwhelmed', 'anxious', 'wired'],
    text: () => `Get a sheet of paper and dump every loose thought, task, and worry onto it — no order, no judgement. Then close the notebook. It's out of your head and into the paper now.`,
  },
  {
    id: 'g-slow-stretch-music', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['tired', 'wired', 'restless'],
    text: () => `Put on one or two slow songs and stretch to them with no routine — just move wherever your body feels tight. Let the music set the pace.`,
  },

  // ---------- indoor · creative (10) ----------
  {
    id: 'g-postcard-future', vibe: ['creative', 'calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['numb', 'stuck', 'lonely'],
    text: () => `Write a postcard or note to yourself one year from now — what's true today, what you hope for. Seal it and set a reminder to open it then.`,
  },
  {
    id: 'g-fill-page-doodle', vibe: ['creative'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['bored', 'scrolling', 'anxious'],
    text: () => `Fill an entire page with one small doodle repeated over and over — a wave, a leaf, a spiral — until it becomes a pattern and your head goes quiet.`,
  },
  {
    id: 'g-books-by-color', vibe: ['creative', 'productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['restless', 'bored', 'stuck'],
    text: () => `Rearrange one shelf of books by colour, or by how they make you feel, instead of any sensible system. Stand back and enjoy the new look.`,
  },
  {
    id: 'g-invent-dessert', vibe: ['creative'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['bored', 'hungry', 'stuck'],
    text: () => `Invent a small dessert or snack from whatever's in the cupboard — no recipe, no shopping. Plate it properly and give it a ridiculous name.`,
  },
  {
    id: 'g-dream-playlist', vibe: ['creative'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['bored', 'numb', 'scrolling'],
    text: () => { const m = U.pick(['a long night drive', 'a slow Sunday morning', 'the mood you wish you were in', 'a film of your week']); return `Handwrite a 10-song playlist for ${m}. Title it. You don't have to actually make it — the writing is the fun.`; },
  },
  {
    id: 'g-still-life-photo', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['bored', 'scrolling', 'stuck'],
    text: () => `Arrange a tiny still life from 3 or 4 objects near you — light it well, fuss over it, and take one photograph you're genuinely pleased with.`,
  },
  {
    id: 'g-learn-3-words', vibe: ['creative'], energy: ['low'], social: 'either',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['bored', 'stuck', 'numb'],
    text: () => `Learn 3 words in a language you don't speak — hello, thank you, and one you choose. Say each out loud until it feels less strange in your mouth.`,
  },
  {
    id: 'g-haiku-now', vibe: ['creative'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['bored', 'numb', 'stuck'],
    text: () => `Write a haiku — 5 syllables, then 7, then 5 — about exactly this moment, wherever you are. Read it out loud once and you're done.`,
  },
  {
    id: 'g-paint-15', vibe: ['creative'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening', 'night'],
    tags: ['stuck', 'numb', 'scrolling'],
    text: () => `Paint, colour, or draw with actual colour for 15 minutes with no goal and no plan to keep it. The point is the doing, not the result.`,
  },
  {
    id: 'g-redraw-room', vibe: ['creative', 'productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['restless', 'stuck', 'bored'],
    text: () => `Sketch a new layout for the room you're in — move the bed, turn the desk, clear a corner. Then actually move one thing tonight to test it.`,
  },

  // ---------- indoor · productive (12) ----------
  {
    id: 'g-fridge-shelf', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['procrastinating', 'overwhelmed', 'restless'],
    text: () => `Clear and wipe down just ONE shelf of the fridge. Toss what's expired, wipe the surface, put back only what's still good. One shelf, then stop.`,
  },
  {
    id: 'g-one-donate-bag', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['overwhelmed', 'stuck', 'procrastinating'],
    text: () => `Fill exactly one bag with things to give away — clothes, books, kitchen clutter. Tie it shut and put it by the door so it actually leaves.`,
  },
  {
    id: 'g-fix-one-thing', vibe: ['productive'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening'],
    tags: ['procrastinating', 'stuck', 'restless'],
    text: () => `Fix or properly deal with one small broken thing you keep stepping around — the loose handle, the dead bulb, the button. Just the one.`,
  },
  {
    id: 'g-desk-reset', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['overwhelmed', 'scrolling', 'stuck'],
    text: () => `Clear your desk or main surface completely — everything off — wipe it down, then put back only the things that earn their place. Bin or rehome the rest.`,
  },
  {
    id: 'g-change-sheets', vibe: ['productive', 'calm'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['tired', 'procrastinating', 'numb'],
    text: () => `Put fresh sheets on the bed. It's a 10-minute job that tonight's version of you will be quietly, deeply grateful for.`,
  },
  {
    id: 'g-reset-bag', vibe: ['productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['procrastinating', 'overwhelmed', 'stuck'],
    text: () => `Empty your everyday bag or backpack completely, bin the rubbish and crumbs, and repack only what you actually need. Five minutes, fully reset.`,
  },
  {
    id: 'g-clean-screens', vibe: ['productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['scrolling', 'procrastinating', 'numb'],
    text: () => `Properly clean the things you look through and at all day — your glasses, your phone screen, the monitor. Small, but the clarity is instant.`,
  },
  {
    id: 'g-meal-plan-one', vibe: ['productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['procrastinating', 'overwhelmed', 'tired'],
    text: () => `Decide one thing: what's for dinner tomorrow. Then set out one non-perishable ingredient for it now, so the decision's already half-made.`,
  },
  {
    id: 'g-pay-one-admin', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['procrastinating', 'avoiding', 'anxious'],
    text: () => `Set a 10-minute timer and knock out the ONE admin task you've been dreading — the form, the email, the booking. Stop when it rings, finished or not.`,
  },
  {
    id: 'g-junk-drawer', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['restless', 'overwhelmed', 'procrastinating'],
    text: () => `Tip the junk drawer out onto a towel, sort the pile fast, and return only the keepers. Everything dead, expired, or mystery goes in the bin.`,
  },
  {
    id: 'g-shoe-sort', vibe: ['productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['procrastinating', 'restless', 'stuck'],
    text: () => `Pair up, wipe down, and line up all your shoes. Set aside the pair you genuinely never wear to give away. Tidy floor, tidy mind.`,
  },
  {
    id: 'g-cable-tame', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['restless', 'overwhelmed', 'procrastinating'],
    text: () => `Untangle and tidy one nest of cables or chargers. Bin the dead ones, coil the rest, and label even just two of them. Future-you stops swearing at the drawer.`,
  },

  // ---------- indoor · movement / high energy (4) ----------
  {
    id: 'g-chore-dance', vibe: ['productive', 'creative'], energy: ['high'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['numb', 'wired', 'restless'],
    text: () => `Put on loud music and do a chore while genuinely dancing through it — dishes, sweeping, folding. The chore is just the cover story for moving.`,
  },
  {
    id: 'g-five-yoga', vibe: ['productive', 'calm'], energy: ['medium'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    tags: ['wired', 'tired', 'restless'],
    text: () => `Hold 5 yoga poses for 30 seconds each — whatever you can remember or invent. Breathe slowly and let yourself wobble; the wobble is the work.`,
  },
  {
    id: 'g-wall-sit-pr', vibe: ['productive'], energy: ['high'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['wired', 'restless', 'numb'],
    text: () => `Wall-sit for as long as you can hold it, rest a minute, then do it once more and beat your first time by 10 seconds. That's the whole challenge.`,
  },
  {
    id: 'g-stair-intervals', vibe: ['productive'], energy: ['high'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['wired', 'restless', 'stuck'],
    text: () => `If you've got stairs at home, go up and down them ${U.int(5, 8)} times at a brisk clip. Count the trips; let your heart actually come up.`,
  },

  // ---------- social · remote (6) ----------
  {
    id: 'g-send-old-photo', vibe: ['calm', 'creative'], energy: ['low'], social: 'social',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['lonely', 'sad', 'numb'],
    text: () => `Find an old photo of you and someone you care about, and just send it to them. No long message needed — the picture says it.`,
  },
  {
    id: 'g-actually-schedule', vibe: ['productive'], energy: ['low'], social: 'social',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['lonely', 'procrastinating', 'stuck'],
    text: () => `Stop saying "we should hang out." Text someone two actual dates and let them pick one. Turn the vague into a plan in 60 seconds.`,
  },
  {
    id: 'g-share-song-memory', vibe: ['calm', 'creative'], energy: ['low'], social: 'social',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['lonely', 'numb', 'scrolling'],
    text: () => `Send someone a song that reminds you of them — and tell them why in one line. It lands more than you'd expect.`,
  },
  {
    id: 'g-real-checkin', vibe: ['calm'], energy: ['low'], social: 'social',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['lonely', 'sad', 'isolated'],
    text: () => `Message one person "how are you, really?" — and mean it. Then stay present for whatever answer comes back.`,
  },
  {
    id: 'g-kind-review', vibe: ['productive', 'calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['numb', 'stuck', 'bored'],
    text: () => `Leave a genuine, specific review for a small business, café, or creator you love. Name the exact thing they do well. Quiet good in the world.`,
  },
  {
    id: 'g-reconnect-relative', vibe: ['calm'], energy: ['low'], social: 'social',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    tags: ['lonely', 'stuck', 'sad'],
    text: () => `Call the relative you keep meaning to call. Five minutes counts. Ask them one thing about their day and let them run with it.`,
  },

  // ---------- mixed / either (8) ----------
  {
    id: 'g-eat-mindful', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['scrolling', 'numb', 'overstimulated'],
    text: () => `Eat one small thing — a square of chocolate, a piece of fruit — with total attention. No phone, no screen. Taste every single bite.`,
  },
  {
    id: 'g-cold-water-reset', vibe: ['productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['tired', 'numb', 'wired'],
    text: () => `Splash cold water on your face a few times, or end your shower with 30 seconds of cold. Feel the system reboot. Surprisingly effective on a flat day.`,
  },
  {
    id: 'g-posture-reset', vibe: ['productive', 'calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['tired', 'wired', 'overwhelmed'],
    text: () => `Stand up tall, roll your shoulders back and down, unclench your jaw, and take 3 long breaths. Reset the body and the head often follows.`,
  },
  {
    id: 'g-full-glass-water', vibe: ['calm', 'productive'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['tired', 'numb', 'wired'],
    text: () => `Drink a full glass of water, slowly, like it's the most interesting thing you'll do this hour. Half the time, the slump was just this.`,
  },
  {
    id: 'g-tidy-5-timer', vibe: ['productive'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['overwhelmed', 'procrastinating', 'stuck'],
    text: () => `Set a 5-minute timer and tidy whatever is physically nearest you until it rings — no planning which, just start with what your hand touches first.`,
  },
  {
    id: 'g-step-out-decide', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    tags: ['overwhelmed', 'anxious', 'stuck'],
    text: () => `Whatever you're stuck deciding — step outside for 2 minutes of air first, decide nothing while you're out there, then come back in and choose.`,
  },
  {
    id: 'g-one-true-sentence', vibe: ['calm', 'creative'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['numb', 'sad', 'overwhelmed'],
    text: () => `Write one true sentence about how you actually feel right now. Just the one. You don't have to do anything with it.`,
  },
  {
    id: 'g-future-self-favor', vibe: ['productive', 'calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'either', reach: 'here', minMinutes: 5, daypart: ['day', 'evening', 'night'],
    tags: ['procrastinating', 'tired', 'overwhelmed'],
    text: () => `Do one 5-minute thing your tomorrow-morning self will be relieved is already done — lay out clothes, fill the kettle, find your keys. A small gift forward.`,
  },

  // ============================================================
  //  COUNTRY-SPECIFIC SET (50) — flavour for the most likely user
  //  countries outside the US. Gated by `regions` (detected from
  //  timezone), so they only ever appear in the right country.
  // ============================================================

  // ---------- United Kingdom (10) ----------
  {
    id: 'uk-pub-half', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'],
    regions: ['UK'], needsOpen: true, tags: ['lonely', 'stuck', 'bored'],
    text: () => `Walk to your local pub, order a half or a soft drink, and sit in a corner soaking up the hum of it for a bit. You don't have to talk to anyone.`,
  },
  {
    id: 'uk-footpath', vibe: ['adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day', 'evening'],
    regions: ['UK'], tags: ['stuck', 'restless', 'bored'],
    text: (ctx) => `Find a public footpath or right of way near you and walk a good stretch of it — aim for about ${ctx.dist(1500)} out before you turn back. Mind the stiles.`,
  },
  {
    id: 'uk-high-street', vibe: ['adventurous', 'calm'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    regions: ['UK'], tags: ['bored', 'autopilot', 'stuck'],
    text: () => `Walk your high street end to end and properly notice it — what's new, what's shuttered, what you've never clocked. Pop into one shop you always pass.`,
  },
  {
    id: 'uk-feed-ducks', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'],
    regions: ['UK'], needsLight: true, tags: ['numb', 'scrolling', 'lonely'],
    text: () => `Walk to the nearest pond and watch the ducks, moorhens, and swans for 10 minutes. (If you must feed them, it's oats or peas — never bread.)`,
  },
  {
    id: 'uk-proper-tea', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    regions: ['UK'], tags: ['overstimulated', 'tired', 'scrolling'],
    text: () => `Stop everything and make a proper brew — kettle, pot or mug, the works — then drink the whole thing sitting down doing absolutely nothing else.`,
  },
  {
    id: 'uk-rain-walk', vibe: ['adventurous', 'calm'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    regions: ['UK'], weatherOnly: ['wet'], tags: ['stuck', 'scrolling', 'restless'],
    text: () => `It's doing what it always does. Put your coat on and go for a walk in the drizzle anyway — that's half of being British. You'll dry.`,
  },
  {
    id: 'uk-canal-towpath', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    regions: ['UK'], tags: ['overwhelmed', 'numb', 'stuck'],
    text: (ctx) => { const p = ctx.nearby(['water']); const w = p ? ` Start from ${p.name}, about ${ctx.dist(p.dist)} away.` : ''; return `Find a canal towpath or riverside path and walk it slowly, watching the water and the narrowboats go by.${w}`; },
  },
  {
    id: 'uk-heritage-plaque', vibe: ['adventurous', 'creative'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    regions: ['UK'], tags: ['bored', 'stuck', 'scrolling'],
    text: () => `Go find a blue plaque, an old milestone, or the oldest building near you. Read it properly and stand a moment with whatever happened there.`,
  },
  {
    id: 'uk-garden-tend', vibe: ['productive', 'calm'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    regions: ['UK'], tags: ['restless', 'procrastinating', 'numb'],
    text: () => `Spend 10 minutes on the garden, allotment, or a window box — deadhead something, pull a few weeds, water the pots. Small and grounding.`,
  },
  {
    id: 'uk-common-walk', vibe: ['calm', 'adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day', 'evening'],
    regions: ['UK'], tags: ['restless', 'overwhelmed', 'stuck'],
    text: () => `Head to the nearest common, green, heath, or park and walk across the open part of it. Get some proper sky over you for 20 minutes.`,
  },

  // ---------- Canada (10) ----------
  {
    id: 'ca-trail-walk', vibe: ['adventurous', 'calm'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day'],
    regions: ['CA'], needsLight: true, tags: ['stuck', 'restless', 'overwhelmed'],
    text: () => `Head to the nearest trail or conservation area and walk in among the trees for a bit. Even 20 minutes in the bush resets something.`,
  },
  {
    id: 'ca-coffee-run', vibe: ['calm', 'adventurous'], energy: ['low'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['day', 'evening'],
    regions: ['CA'], needsOpen: true, tags: ['bored', 'stuck', 'lonely'],
    text: () => `Do a coffee run to the nearest spot and order it a way you never have — different size, different roast, a tea even. Sit in for once.`,
  },
  {
    id: 'ca-skate', vibe: ['adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'],
    regions: ['CA'], seasons: ['winter'], tags: ['wired', 'restless', 'bored'],
    text: () => `It's the season for it — get to an outdoor rink or a maintained ice path and skate, or just walk a lap on the ice. (Only if it's properly frozen and marked safe.)`,
  },
  {
    id: 'ca-bundle-walk', vibe: ['adventurous', 'productive'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'],
    regions: ['CA'], seasons: ['winter'], maxTemp: 0, tags: ['numb', 'tired', 'stuck'],
    text: () => `It's cold, sure — bundle up properly and go out anyway for 12 minutes. We don't hibernate up here. Hot drink waiting when you're back.`,
  },
  {
    id: 'ca-lake-look', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['day', 'evening'],
    regions: ['CA'], tags: ['overwhelmed', 'numb', 'stuck'],
    text: (ctx) => { const p = ctx.nearby(['water']); const w = p ? `${p.name} (about ${ctx.dist(p.dist)} away)` : `the nearest lake or waterfront`; return `Drive or walk to ${w} and just stand looking out over the water for a while. Big water, small worries.`; },
  },
  {
    id: 'ca-lookout', vibe: ['adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'],
    regions: ['CA'], tags: ['stuck', 'restless', 'overwhelmed'],
    text: () => `Get to a lookout, a hill, or the edge of town where the sky opens right up, and take in the big view for a few minutes. The country's mostly horizon.`,
  },
  {
    id: 'ca-maple-treat', vibe: ['calm', 'creative'], energy: ['low'], social: 'either',
    budget: 'free', env: 'indoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    regions: ['CA'], tags: ['tired', 'numb', 'scrolling'],
    text: () => `Make yourself something small with maple in it — drizzle it on toast, stir it into tea or oats — and have it slowly, no phone. Tiny, local comfort.`,
  },
  {
    id: 'ca-loon-dusk', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['evening'],
    regions: ['CA'], seasons: ['summer'], tags: ['scrolling', 'restless', 'lonely'],
    text: () => `Get near some water at dusk and just listen — for loons, frogs, the lap of the lake. Summer evenings up here have a soundtrack worth catching.`,
  },
  {
    id: 'ca-farmers-market', vibe: ['adventurous', 'calm'], energy: ['low', 'medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day'],
    regions: ['CA'], needsOpen: true, tags: ['bored', 'lonely', 'stuck'],
    text: () => `Hit up a farmers' market or farm stand and buy one local thing you don't usually — the season's short, so eat it while it's here.`,
  },
  {
    id: 'ca-water-summer', vibe: ['adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'],
    regions: ['CA'], seasons: ['summer'], minTemp: 20, tags: ['wired', 'restless', 'stuck'],
    text: () => `Summer's the short and glorious one — get on or in the water. Swim, paddle, canoe, or just wade off a dock. Don't waste the warm months.`,
  },

  // ---------- Australia (10) ----------
  {
    id: 'au-beach-walk', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['day', 'evening'],
    regions: ['AU'], tags: ['overwhelmed', 'numb', 'stuck'],
    text: (ctx) => { const p = ctx.nearby(['water']); const w = p ? ` Closest stretch is ${p.name}, about ${ctx.dist(p.dist)} away.` : ''; return `Get down to the nearest beach or foreshore and walk along the water's edge with your shoes off.${w} Let the waves do the talking.`; },
  },
  {
    id: 'au-ocean-dip', vibe: ['adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'],
    regions: ['AU'], seasons: ['summer'], minTemp: 22, tags: ['wired', 'restless', 'overstimulated'],
    text: () => `It's warm — go for a dip. Ocean, river, or the local pool, doesn't matter. Get in past your shoulders at least once. Swim between the flags.`,
  },
  {
    id: 'au-bushwalk', vibe: ['adventurous', 'calm'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day'],
    regions: ['AU'], needsLight: true, tags: ['stuck', 'restless', 'overwhelmed'],
    text: () => `Take a short bushwalk on a local track. Go quietly and you'll spot more — lizards, parrots, whatever's about. Take water; it's further than it looks.`,
  },
  {
    id: 'au-flat-white', vibe: ['calm', 'adventurous'], energy: ['low'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['day'],
    regions: ['AU'], needsOpen: true, tags: ['lonely', 'stuck', 'scrolling'],
    text: () => `Get a flat white from a local café and drink it sitting outside in the sun, watching the street. No laptop, no rush — proper café culture.`,
  },
  {
    id: 'au-bird-listen', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening'],
    regions: ['AU'], tags: ['anxious', 'numb', 'scrolling'],
    text: () => `Step outside and tune into the birds — magpies carolling, a kookaburra, the screech of cockatoos. Pick out ${U.int(3, 5)} different calls. The bush is loud if you listen.`,
  },
  {
    id: 'au-arvo-walk', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['evening'],
    regions: ['AU'], tags: ['tired', 'restless', 'stuck'],
    text: () => `Take an arvo or early-evening walk once the heat's off the day. Round the block, down to the shops, wherever — just get the legs moving before tea.`,
  },
  {
    id: 'au-park-bbq', vibe: ['adventurous', 'calm'], energy: ['low', 'medium'], social: 'social',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'],
    regions: ['AU'], tags: ['lonely', 'isolated', 'bored'],
    text: () => `Head to a park with a public BBQ and either fire it up or just take a picnic. Text someone to come along — half the country basically lives at the park.`,
  },
  {
    id: 'au-local-shops', vibe: ['adventurous'], energy: ['low'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day', 'evening'],
    regions: ['AU'], needsOpen: true, tags: ['bored', 'stuck', 'autopilot'],
    text: () => `Walk down to the local shops or milk bar for one small thing. The walk's the point; the thing's just the excuse to leave the house.`,
  },
  {
    id: 'au-southern-stars', vibe: ['calm', 'adventurous'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['night'],
    regions: ['AU'], tags: ['scrolling', 'cant-sleep', 'restless'],
    text: () => `Get away from the streetlights and find the Southern Cross. Once you've got it, see if you can trace your way to the pointers. Big southern sky.`,
  },
  {
    id: 'au-sunrise-water', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['day'],
    regions: ['AU'], tags: ['cant-sleep', 'numb', 'stuck'],
    text: () => `Catch the early light at the water — sunrise over the sea if you're on the east coast, the calm of dawn anywhere. Worth being up for, just this once.`,
  },

  // ---------- India (10) ----------
  {
    id: 'in-morning-walk', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day'],
    regions: ['IN'], tags: ['tired', 'scrolling', 'stuck'],
    text: () => `Join the morning walkers at the nearest park or maidan. A few brisk laps in the cool of the morning before the day properly starts. Greet a regular.`,
  },
  {
    id: 'in-chai-break', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    regions: ['IN'], needsOpen: true, tags: ['overstimulated', 'tired', 'scrolling'],
    text: () => `Walk to the nearest stall for a cutting chai and drink it standing there, slowly, watching the street go by. The ten-rupee reset.`,
  },
  {
    id: 'in-market-bazaar', vibe: ['adventurous'], energy: ['medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'],
    regions: ['IN'], needsOpen: true, tags: ['bored', 'stuck', 'numb'],
    text: () => `Wander the local market or bazaar with no list. Take in the colour and noise, and buy one fruit or snack you've never tried before.`,
  },
  {
    id: 'in-terrace-air', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 10, daypart: ['day', 'evening', 'night'],
    regions: ['IN'], tags: ['overwhelmed', 'anxious', 'overstimulated'],
    text: () => `Go up to the terrace, rooftop, or balcony and just stand in the open air for 10 minutes. Watch the rooftops, the kites, the light changing.`,
  },
  {
    id: 'in-monsoon-feel', vibe: ['calm', 'adventurous'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day', 'evening'],
    regions: ['IN'], weatherOnly: ['wet'], tags: ['scrolling', 'numb', 'stuck'],
    text: () => `It's raining — step onto the balcony or just outside and feel the monsoon for a few minutes. Breathe in that first-rain-on-hot-earth smell.`,
  },
  {
    id: 'in-kite-fly', vibe: ['adventurous', 'creative'], energy: ['medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'here', minMinutes: 15, daypart: ['day'],
    regions: ['IN'], needsLight: true, tags: ['bored', 'restless', 'stuck'],
    text: () => `Get up to the terrace or an open ground and fly a kite for a while — or make a quick paper one. If there's a breeze, that's the whole afternoon sorted.`,
  },
  {
    id: 'in-quiet-place', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    regions: ['IN'], tags: ['anxious', 'overwhelmed', 'stuck'],
    text: () => `Visit a nearby quiet place — a temple, gurudwara, mosque, church, or just a calm corner of a park — and sit in the stillness for 10 minutes. No agenda.`,
  },
  {
    id: 'in-evening-stroll', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['evening'],
    regions: ['IN'], tags: ['restless', 'lonely', 'tired'],
    text: () => `Take an evening stroll around the colony once it's cooled down. Nod to the neighbours, notice the day winding down. The classic shaam ki sair.`,
  },
  {
    id: 'in-feed-birds', vibe: ['calm', 'productive'], energy: ['low'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'here', minMinutes: 5, daypart: ['day'],
    regions: ['IN'], tags: ['numb', 'sad', 'scrolling'],
    text: () => `Put out a little grain and a bowl of fresh water for the birds and squirrels — sparrows, pigeons, whoever turns up. Then watch them come for a minute.`,
  },
  {
    id: 'in-street-food-new', vibe: ['adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    regions: ['IN'], needsOpen: true, tags: ['bored', 'stuck', 'lonely'],
    text: () => `Find a busy, popular stall (busy means fresh) and try one street snack you've never had. Eat it right there. The crowd is the review.`,
  },

  // ---------- Germany (10) ----------
  {
    id: 'de-waldspaziergang', vibe: ['calm', 'adventurous'], energy: ['medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day'],
    regions: ['DE'], needsLight: true, tags: ['overwhelmed', 'stuck', 'restless'],
    text: (ctx) => `Take a proper Spaziergang in the nearest woods — aim for about ${ctx.dist(2000)} of unhurried walking among the trees. The Germans walk in the Wald for a reason.`,
  },
  {
    id: 'de-baeckerei', vibe: ['calm', 'adventurous'], energy: ['low'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'walk', minMinutes: 12, daypart: ['day'],
    regions: ['DE'], needsOpen: true, tags: ['tired', 'scrolling', 'lonely'],
    text: () => `Walk to a bakery for something fresh — a Brötchen, a pretzel, a slice of something. Eat it warm on the way home. Small, daily, good.`,
  },
  {
    id: 'de-sunday-quiet', vibe: ['calm'], energy: ['low', 'medium'], social: 'either',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 20, daypart: ['day'],
    regions: ['DE'], tags: ['overstimulated', 'restless', 'stuck'],
    text: () => `Lean into the quiet — the shops are shut, nothing's demanding anything. Take a slow, aimless walk with no errands attached. Ruhe is the whole point.`,
  },
  {
    id: 'de-see-swim', vibe: ['adventurous'], energy: ['medium', 'high'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'],
    regions: ['DE'], seasons: ['summer'], minTemp: 22, tags: ['wired', 'restless', 'overstimulated'],
    text: () => `It's warm — head to the nearest lake (See) or open-air pool (Freibad) and get in the water. Summers are made for this here.`,
  },
  {
    id: 'de-pfand-return', vibe: ['productive'], energy: ['low', 'medium'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 15, daypart: ['day', 'evening'],
    regions: ['DE'], needsOpen: true, tags: ['procrastinating', 'restless', 'stuck'],
    text: () => `Gather up the Pfand bottles that have been piling up and walk them to the machine. A small, satisfying loop — and you get the deposit back.`,
  },
  {
    id: 'de-biergarten', vibe: ['calm', 'adventurous'], energy: ['low'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['day', 'evening'],
    regions: ['DE'], needsOpen: true, tags: ['lonely', 'stuck', 'bored'],
    text: () => `Sit in a beer garden under the chestnut trees with a drink — a Radler, an Apfelschorle, whatever. Bring a book or just watch. Unhurried by design.`,
  },
  {
    id: 'de-kaffee-kuchen', vibe: ['calm'], energy: ['low'], social: 'either',
    budget: 'low', env: 'indoor', reach: 'here', minMinutes: 15, daypart: ['day', 'evening'],
    regions: ['DE'], tags: ['tired', 'overstimulated', 'scrolling'],
    text: () => `Do a proper Kaffee und Kuchen — a coffee and a slice of something, sat down, no phone, no rush. The afternoon ritual that says: pause now.`,
  },
  {
    id: 'de-christmas-market', vibe: ['calm', 'adventurous'], energy: ['low', 'medium'], social: 'either',
    budget: 'low', env: 'outdoor', reach: 'drive', minMinutes: 30, daypart: ['evening'],
    regions: ['DE'], seasons: ['winter'], needsOpen: true, tags: ['lonely', 'numb', 'scrolling'],
    text: () => `If a Weihnachtsmarkt is on, go wander it — the lights, the Glühwein steam, the woodsmoke and cinnamon. Buy one small warm thing and just soak it in.`,
  },
  {
    id: 'de-park-bench', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'walk', minMinutes: 10, daypart: ['day', 'evening'],
    regions: ['DE'], tags: ['overwhelmed', 'anxious', 'numb'],
    text: () => `Walk to a park, find a Parkbank, and just sit on it doing nothing for 10 minutes — watching the dogs, the joggers, the leaves. Sitzen und gucken.`,
  },
  {
    id: 'de-waldbaden', vibe: ['calm'], energy: ['low'], social: 'solo',
    budget: 'free', env: 'outdoor', reach: 'drive', minMinutes: 20, daypart: ['day'],
    regions: ['DE'], needsLight: true, tags: ['anxious', 'overstimulated', 'overwhelmed'],
    text: () => `In the nearest woods, stop walking, stand still for 5 minutes, and just breathe the tree air — Waldbaden, forest bathing. Let the green do its quiet work.`,
  },
];
