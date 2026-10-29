export const marketSomaSuite = {
  slug: "market-soma-suite",
  category: "Distribution // Launch",
  title: "Market the Soma suite: where to launch it, and on which day",
  excerpt:
    "You shipped three repos and nobody came. Fix the home address first, then work this calendar: Show HN on Tuesday, Product Hunt at 12:01 AM, Reddit one sub at a time, and a podcast feed that needs a bigger cover.",
  image:
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=675&fit=crop",
  imageAlt: "A laptop, notebook, and coffee on a desk, ready to write a launch post",
  author: { name: "Benjamin Mayanja", title: "Founder, Soma" },
  publishedAt: "2026-10-24T00:00:00Z",
  tags: ["Marketing", "Launch", "Distribution", "Soma Labs", "Son"],
  intro:
    "You built Soma, Labs, and Son, and you shipped them to a Vercel URL nobody visits. That gap is normal. Shipping ends when the deploy turns green, but launching ends when strangers can find you, get you in ten seconds, and tell a friend. This guide closes that gap in order: one home address, one storefront, search plumbing, then a two week calendar with the days that actually work.",
  body: [
    "## The pain: your launch address disagrees with itself",

    "Picture launch day before the fix. Someone shares your link and the preview card points at `soma.vercel.app`. That domain was never yours: an earlier draft of this repo guessed it because the app is called Soma and it deploys on Vercel, and the real address belongs to a stranger. Your actual deployment answers at two addresses you do own: the `soma-myk5.vercel.app` URL Vercel assigned, and your custom `soma.mayanja.dev`. Without one canonical home, share cards, search results, and the podcast feed each advertise a different address. Launching before fixing that pours traffic into a bucket with a hole in it.",

    "## Step 1: pick one home address",

    "Choose `soma.mayanja.dev` as the canonical home: it is what your docs already promise, and your own custom domain. Then do three small jobs in this order. First, redirect the assigned `soma-myk5.vercel.app` to it with a host-based redirect in `vercel.json` so old links keep working. (There is no redirect for the guessed `soma.vercel.app`: a domain you never owned cannot be redirected, only unreferenced.) Second, rewrite the OG block: `og:url`, `og:image`, and the Twitter image must use the canonical domain, or every share card advertises the wrong address. Third, update the URLs baked into `public/podcast.xml`: the channel `<link>`, the `<atom:link self>`, and every episode URL. Podcast directories treat the feed URL as identity, so a domain change later reads as a brand new show. All three jobs are done: the assigned URL redirects, no file references the stranger's domain, and the OG block and feed point at `mayanja.dev`.",

    "> One address everywhere. If a stranger can reach the same page through two domains, you do not have a home, you have a rumor.",

    "## Step 2: turn GitHub into your storefront",

    "For developers, your GitHub profile is the landing page, not your marketing site. Pin all three repos (`soma`, `soma-labs`, `son`) so the suite reads as one body of work. Give each repo topics so search finds them: `self-hosted`, `ai`, `edtech`, and `voice-agent` cover the spread. Set the social preview image to your existing `og-image.png` and put the canonical URL in each repo About box. Crosslink the READMEs in both directions: Soma already links out to Labs and Son, so return the favor from inside those repos. Your brand folder already holds reserved icons for this exact job: `soma-labs.png` for the drills repo and `son-voice.png` for the voice agent. Use them, so each repo is recognizable at thumbnail size.",

    "## Step 3: let Google in the door",

    "Right now a crawler gets one thing: a single `<title>Soma</title>` and a JavaScript bundle. That is why search plumbing comes before any launch post. Add `robots.txt` and `sitemap.xml` to `public/`, give every route its own title and description (each story and guide has one baked in already, it just never reaches the `<head>`), then register the canonical domain in Google Search Console and Bing Webmaster Tools. This is boring work with no dopamine in it, and it decides whether your Show HN spike leaves anything behind after the front page forgets you.",

    "## Step 4: Show HN on a Tuesday morning",

    "Hacker News is your highest leverage post, and it is also one shot: reposts of the same project get flagged. The timing data is unusually consistent. Tuesday averages the highest score across 110,000+ tracked posts<sup><a href=\"#ref-4\">4</a></sup>, the old hands say Tuesday through Thursday morning US Eastern for maximum traffic<sup><a href=\"#ref-5\">5</a></sup>, and one 23,000-post analysis found posts made between midnight and 1 AM Eastern earn double the comments<sup><a href=\"#ref-6\">6</a></sup>. So schedule the post for Tuesday around 8 to 9 AM Eastern, title it `Show HN: ...` with the self-hosting angle up front, and keep the whole day free. The comments decide the outcome more than the post does: answer every technical question fast, admit what is rough, and link the Labs drills when someone asks for proof instead of promises.",

    "> HN rewards the builder who stays in the room. Post and vanish, and the thread decides you are a drive-by.",

    "## Step 5: Product Hunt at 12:01 AM Pacific, Tuesday to Thursday",

    "Product Hunt is a scheduled race, not a casual post. Launches go live at 12:01 AM Pacific, and the winners treat it like election day: Tuesday through Thursday brings maximum traffic<sup><a href=\"#ref-1\">1</a></sup>, with most winning teams launching Tuesday or Wednesday and driving 60% or more of the day's traffic from a prebuilt waitlist<sup><a href=\"#ref-3\">3</a></sup>. If you have no audience yet, flip the strategy: Saturday needs only about 266 points to crack the top 5 versus 360 on Wednesday, so a quiet weekend gives a small launch its best shot at a badge<sup><a href=\"#ref-2\">2</a></sup>. Either way, ship a 2 minute demo video (Son answering a spoken question is the clip), write the first comment as your founder story before voting starts, and reply to every comment that day. Never launch the same week as Show HN: each deserves its own news cycle.",

    "## Step 6: Reddit, one sub at a time",

    "Reddit is not one platform, it is a hundred bouncers with different rules, so go one sub at a time. Start with r/SideProject: self-promotion is explicitly welcome there if you use the right tags and flair and stick around to reply<sup><a href=\"#ref-7\">7</a></sup>. Next, r/selfhosted, but read its rules first: drive-by promotion gets removed, so post as a self-hosting guide instead of an announcement. Your `ship-soma` guide already is that post, almost word for word. Everywhere else, respect the 90/10 rule: nine genuine contributions for every one plug. One account, real history, no fresh account posting links on day one.",

    "## Step 7: write where developers already read",

    "Your launch posts decay in a day; canonical crossposts compound. Republish `why-i-built-soma` and one technical guide to Dev.to and Hashnode with the `canonical_url` pointed at your domain, so Google credits the original instead of splitting your ranking between copies. Then open an Indie Hackers milestones thread and log the numbers in public: stars, deploys, test scores. Builders follow graphs that move, and that thread becomes the waitlist that powers your Product Hunt day.",

    "## Step 8: let Son do the talking",

    "Nobody shares an architecture diagram. Record one 60 to 90 second screen capture: write a note, flip the lock toggle to public, then answer a spoken test question while Son grades it live. Post that clip natively to X, LinkedIn, and YouTube on three separate days, each with one line of context. Text posts explain the suite; the voice clip is the thing strangers repost. Son leads every video move, Labs leads every code move, Soma itself leads every writing move.",

    "## Step 9: submit the podcast feed",

    "Your RSS feed already exists at `/podcast.xml` with one episode, and both Apple and Spotify accept exactly that: a public RSS 2.0 feed submitted through Apple Podcasts Connect<sup><a href=\"#ref-8\">8</a></sup> that meets the technical requirements<sup><a href=\"#ref-9\">9</a></sup>. Two jobs before you submit. First, replace the artwork: the feed currently points at `favicon.ico`, and directories want a large square cover, so export one from your icon set at full size. Second, publish episode 2 first. One episode looks abandoned; two looks like a show. After acceptance, every new episode distributes itself.",

    "## The two week calendar",

    "Plumbing first, applause second. Nothing launches until steps 1 to 3 are done.",

    "Week 0 (plumbing) → canonical domain + redirect → OG and feed URLs → GitHub pins, topics, previews, crosslinks → robots.txt, sitemap, Search Console → podcast cover art + episode 2\nWeek 1, Tue → Show HN, 8 AM Eastern, free all day for comments\nWeek 1, Thu → r/SideProject post with launch flair\nWeek 1, Fri → first Dev.to crosspost with canonical_url\nWeek 2, Tue → Product Hunt, live 12:01 AM Pacific, reply all day\nWeek 2, Thu → r/selfhosted guide post + first video clip\nWeek 2, Fri → submit podcast feed to Apple and Spotify",

    "Two weeks after that, read the numbers and double down on whichever channel sent real users, not just votes. Launches are how strangers first hear the name. The suite is what makes them stay.",
  ],

  bentoHighlights: [
    {
      label: "HOME FIRST",
      title: "One canonical domain",
      description:
        "One canonical domain: soma.mayanja.dev, the only address you own. The vercel.app strings were never yours. The OG tags and feed URLs point home now, so every launch post inherits the right address.",
    },
    {
      label: "TUESDAY TO THURSDAY",
      title: "Launch when devs are watching",
      description:
        "Show HN peaks Tuesday morning Eastern; Product Hunt peaks Tuesday to Thursday from 12:01 AM Pacific. Weekends are easier to win, emptier to win in.",
    },
    {
      label: "SON IS THE DEMO",
      title: "Nobody shares a diagram",
      description:
        "A 60 second clip of Son hearing a spoken answer and grading it live out-pulls every feature list. Son leads video, Labs leads code, Soma leads writing.",
    },
  ],

  pullQuotes: [
    {
      quote:
        "Shipping ends when the deploy turns green, but launching ends when strangers can find you, get you in ten seconds, and tell a friend.",
    },
    {
      quote:
        "HN rewards the builder who stays in the room. Post and vanish, and the thread decides you are a drive-by.",
    },
    {
      quote:
        "Launches are how strangers first hear the name. The suite is what makes them stay.",
    },
  ],

  references: [
    {
      title: "Best Day to Launch on Product Hunt (2026 data)",
      url: "https://phlaunchkit.com/blog/best-day-to-launch-on-product-hunt",
      description: "Tue-Thu for maximum traffic; weekends for best shot at a badge.",
    },
    {
      title: "Databox: all 2026 PH launches analyzed",
      url: "https://www.producthunt.com/p/databox/i-ve-analyzed-all-2026-ph-launches-to-find-the-best-day-to-launch",
      description: "Saturday needs ~266 median points for top 5 vs ~360 on Wednesday.",
    },
    {
      title: "How to Launch on Product Hunt 2026",
      url: "https://getlaunchlist.com/checklists/producthunt",
      description: "12:01 AM PST launches, Tue/Wed timing, waitlist-driven traffic pattern.",
    },
    {
      title: "hn-best-posting-times (110k+ signals)",
      url: "https://github.com/JoseMarquezAlberti/hn-best-posting-times",
      description: "Tuesday averages the top score at 58.2 across tracked HN posts.",
    },
    {
      title: "Best time to post Show HN (Myriade)",
      url: "https://www.myriade.ai/blogs/when-is-it-the-best-time-to-post-on-show-hn",
      description: "Tuesday to Thursday recommendation; Sunday breakout-rate note.",
    },
    {
      title: "When to Post on HN: 23k posts analyzed",
      url: "https://news.ycombinator.com/item?id=44569046",
      description: "Midnight-1AM Eastern posts earn roughly double the comments.",
    },
    {
      title: "r/SideProject posting guidance",
      url: "https://www.reddit.com/r/SideProject/",
      description: "Self-promotion welcome with correct tags and community participation.",
    },
    {
      title: "Submit a new show (Apple Podcasts Connect)",
      url: "https://podcasters.apple.com/support/897-submit-a-show",
      description: "Add a show with an RSS feed through Podcasts Connect.",
    },
    {
      title: "Podcast RSS feed requirements (Apple)",
      url: "https://podcasters.apple.com/support/823-podcast-requirements",
      description: "Public RSS 2.0 feed with required channel and item elements.",
    },
    {
      title: "Dev.to",
      url: "https://dev.to",
      description: "Developer publishing platform supporting canonical_url crossposts.",
    },
  ],
};
