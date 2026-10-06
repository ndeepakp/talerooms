import Link from "next/link";
import styles from "./LandingWelcome.module.css";
import { Brand } from "@/components/layout/Brand";
import { PublicFooter } from "@/components/layout/PublicNavigation";
import { FeaturedBookPreview } from "./FeaturedBookPreview";
import { BookPreview } from "./BookPreview";
import type { CoverStyle } from "@/lib/cover-style";

export type LandingStory = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  cover_style: CoverStyle | null;
  summary?: string | null;
};

/** Session resolution and published-story queries stay on the server. */
export function LandingWelcome({ stories }: { stories: LandingStory[] }) {
  const featured = stories[0];
  return (
    <div className={styles.page}>
      <div className={styles.headerSurface}>
        <header className={styles.navigation}>
          <Brand />
          <nav aria-label="Main navigation" className={styles.navLinks}>
            <Link href="/about" className={styles.aboutLink}>Our story</Link>
            <Link href="/login" className={styles.loginButton}>Log in</Link>
          </nav>
        </header>
      </div>
      <main id="main-content">
        <div className={styles.opening}>
          <section aria-labelledby="welcome-title" className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span aria-hidden="true" /> A home for original stories</p>
              <h1 id="welcome-title">Get lost.<br />Find your<br /><em>people.</em></h1>
              <p className={styles.intro}>Stories that pull you in. Voices that stay with you. Discover original fiction and connect with the writers behind it.</p>
              <div className={styles.actions}>
                <Link href="#stories" className={styles.primary}>Find your next story <span aria-hidden="true">↗</span></Link>
                <Link href="/signup" className={styles.writeLink}>Start writing <span aria-hidden="true">→</span></Link>
              </div>
            </div>
            <div className={styles.spotlight}>
              <div className={styles.spotlightLabel}><span>THE READING ROOM</span></div>
              {featured ? (
                <FeaturedBookPreview story={featured} />
              ) : (
                <div className={styles.emptySpotlight}><span aria-hidden="true">Aa</span><p>Every world begins<br />with a few words.</p><Link href="/signup">Write the first chapter ↗</Link></div>
              )}
            </div>
          </section>
          <div className={styles.manifesto}><span>Original voices.</span><span>Real connections.</span><span>Your stories. Your rights.</span></div>
        </div>
      <section id="stories" aria-labelledby="stories-title" className={styles.shelf}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.kicker}>MAKE YOURSELF AT HOME</p><h2 id="stories-title">An open door.<br />A different world.</h2></div>
          <p>Pick a story. Meet a new voice.<br />See where the first chapter takes you.</p>
        </div>
        {stories.length ? (
          <ul className={styles.storyGrid}>
            {stories.map((story, index) => (
              <li key={story.id} className={styles.story}>
                <div className={styles.shelfStage}>
                  <span className={styles.storyNumber} aria-hidden="true">0{index + 1}</span>
                  <div className={styles.shelfBook}><BookPreview story={story} /></div>
                </div>
                <Link href={`/stories/${story.slug ?? story.id}`} className={styles.storyInfo}><h3>{story.title}</h3><span aria-hidden="true">↗</span></Link>
                <p className={styles.storyAuthor}>by {story.author ?? "Unknown author"}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.emptyShelf}><h3>Every shelf begins with a story.</h3><p>There are no published stories here yet. Yours could be the first.</p><Link href="/signup">Start your story →</Link></div>
        )}
      </section>
      <section aria-labelledby="writers-title" className={styles.writers}>
        <div><p className={styles.kicker}>FOR THE VOICE ONLY YOU HAVE</p><h2 id="writers-title">Your imagination.<br /><em>Your rules.</em></h2></div>
        <div className={styles.writerCopy}><p>Give your stories a home. Publish chapter by chapter, keep ownership of your work, and build a readership that comes back for you.</p><Link href="/signup" className={styles.writerButton}>Start writing, free <span aria-hidden="true">↗</span></Link></div>
      </section>
      </main>
      <PublicFooter />
    </div>
  );
}
