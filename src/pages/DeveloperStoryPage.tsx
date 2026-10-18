import { Link } from "react-router-dom";
import { Stars } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import ProfileOverview from "@/components/sections/ProfileOverview";
import ShareButtons from "@/components/ui/ShareButtons";
import PrintButton from "@/components/ui/PrintButton";
import PullQuote from "@/components/ui/PullQuote";
import StoryCard from "@/components/cards/StoryCard";
import NewsletterSignup from "@/components/ui/NewsletterSignup";
import { ruthStory, ruthMoreStories } from "@/content/registry";
import { md } from "@/lib/markdown";

export default function DeveloperStoryPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop pt-xxl mb-giant">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          <div className="md:col-span-8">
            <AccentBar variant="small" className="mb-md" />
            <h1 className="font-sora text-headline-md mb-md leading-tight text-on-surface">
              {ruthStory.title}
            </h1>
            <p className="font-sora text-article-title text-on-surface-variant mb-xl" dangerouslySetInnerHTML={{ __html: md(ruthStory.description) }} />
            <div className="flex items-center gap-sm font-sora text-metadata-tag text-primary uppercase tracking-widest mb-xxl">
              <span>{ruthStory.author.name}</span>
              {ruthStory.author.handle && (
                <>
                  <span className="text-on-surface-muted">//</span>
                  <span className="text-on-surface-muted">
                    {ruthStory.author.handle}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profile Bar */}
        <ProfileOverview
          location={ruthStory.location}
          social={ruthStory.social}
          website={ruthStory.website}
          organizations={ruthStory.organizations}
        />
      </section>

      {/* Main Content */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop mb-giant">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          {/* Sidebar */}
          <aside className="hidden md:block md:col-span-3">
            <div className="sticky top-32 space-y-xl">
              <div className="p-lg bg-surface-container border border-border-default rounded-lg">
                <p className="font-dm-sans text-body-base italic text-on-surface-variant">
                  "Soma: AI-assisted deep research on technology, economics, philosophy, and beyond. A personal publishing platform for ideas that matter."
                </p>
              </div>
              <ShareButtons variant="small-circle" />
              <PrintButton compact label="Print / Save PDF" />
            </div>
          </aside>

          {/* Article Body */}
          <article className="md:col-span-8 md:col-start-5 space-y-xl">
            {/* Intro pullout */}
            <div className="p-xl bg-surface-container-low border-l-4 border-secondary">
              <p className="font-dm-sans text-xl md:text-2xl leading-relaxed text-on-surface">
                Hey! I'm Ruth Ikegah and I'm an open source program manager,
                technical writer, GitHub Star, and public speaker. Currently, I'm
                working as an Open Source Consultant at Bitgeria and serve as the
                Community Lead for CHAOSS Africa.
              </p>
            </div>

            <div className="space-y-lg font-dm-sans text-body-base leading-loose text-on-surface">
              <p>
                I think it's important to change the perception that Africans are
                merely consumers; we are creators as well. By helping people
                across Africa build projects and showcase their work globally, I
                hope to change this narrative and demonstrate that Africa is also
                a hub for innovation and creativity, especially within the open
                source community.
              </p>
              <p>
                Right now, Africa's rate of participation and overall volume of
                open source projects is relatively low in comparison to other
                regions of the world. This level of engagement is frustrating
                because I've seen the motivation and passion of Africans when
                they go abroad, and I want to help them realize that they can
                create those kinds of projects right here in Africa too.
              </p>
            </div>

            {/* Featured Image */}
            <figure className="my-xxl">
              <img
                alt="Ruth Ikegah working on her laptop in a garden office"
                className="w-full h-auto aspect-[1.67] object-cover rounded-lg border border-border-default"
                src="https://images.unsplash.com/photo-1732210038531-9cefab37885a?w=1200&h=675&fit=crop"
              />
              <figcaption className="mt-sm font-sora text-xs text-on-surface-muted italic">
                Ruth Ikegah exploring new ways to empower her community through
                code.
              </figcaption>
            </figure>

            <h2 className="font-sora text-article-title pt-lg text-on-surface">
              Discovering the power of community
            </h2>
            <div className="space-y-lg font-dm-sans text-body-base leading-loose text-on-surface">
              <p>
                Had you asked me during college if I could envision myself working
                in the tech industry, my answer would have been a resounding NO. I
                wasn't particularly enthusiastic about computers. I didn't dislike
                them, but they just weren't my thing. I was looking for ways to
                empower my community, and I didn't think that was possible from
                behind a computer screen.
              </p>
            </div>

            {/* Pull Quote */}
            <PullQuote
              variant="border-y"
              quote="I was looking for ways to empower my community, and I didn't think that was possible from behind a computer screen."
              attribution="Ruth Ikegah"
            />

            <div className="space-y-lg font-dm-sans text-body-base leading-loose text-on-surface">
              <p>
                My friend Peace Ojemeh suggested that I learn Python and explained
                how it can be used to analyze microbiological data. I began
                teaching myself by seeking out online resources, watching YouTube
                videos, and following tech creators on Twitter. My plan was to
                learn the basics of programming and then find something that I
                could build using my knowledge from university.
              </p>
              <p>
                Things really took off when I found open source and realized that
                the power of community was being utilized to build world-changing
                digital solutions.
              </p>
            </div>

            <h2 className="font-sora text-article-title pt-lg text-on-surface">
              Paving the way for inclusivity through CHAOSS
            </h2>
            <div className="space-y-lg font-dm-sans text-body-base leading-loose text-on-surface">
              <p>
                Working with the GNOME Project helped me build connections within
                open source, which led me to the Community Health Analytics Open
                Source Software (CHAOSS) project. CHAOSS is a Linux Foundation
                project focused on raising awareness of open source community
                health on a global scale.
              </p>
              <p>
                Leading a community can be challenging and complex. With CHAOSS,
                my role involves overseeing community management and maintaining
                documentation, among other things. The project has more than 1,000
                members, including drive-by contributors, so my job is to ensure
                everyone feels welcome and included.
              </p>
            </div>

            {/* Visual Accent Block */}
            <div className="p-xl bg-surface-container border border-border-default rounded-xl relative overflow-hidden group hover:border-primary transition-all duration-300">
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary to-secondary" />
              <h3 className="font-sora text-xl mb-md text-on-surface">
                Advancing African open source through authenticity
              </h3>
              <p className="font-dm-sans text-body-base text-on-surface-variant leading-relaxed">
                Being authentic is super important when you're trying to make a
                difference. When I started, I wasn't looking to be famous or
                anything:I just wanted to help people. When you're genuine and you
                give value to others, it's way easier for people to connect with
                you.
              </p>
              <div className="mt-lg flex items-center gap-md">
                <Stars className="w-5 h-5 text-secondary" />
                <span className="font-sora text-metadata-tag text-on-surface uppercase tracking-widest">
                  GitHub Star // Community Leader
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* More Stories */}
      <section className="bg-surface-container-low py-giant border-t border-border-default">
        <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
          <div className="flex justify-between items-end mb-xxl">
            <div>
              <AccentBar variant="small" className="mb-md" />
              <h2 className="font-sora text-headline-md text-on-surface">
                More Stories
              </h2>
            </div>
            <Link
              to="/stories"
              className="font-sora text-metadata-tag uppercase tracking-widest text-primary hover:underline pb-2"
            >
              View all articles
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {ruthMoreStories.map((story) => (
              <StoryCard key={story.id} article={story} />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSignup variant="subtle" />
    </div>
  );
}
