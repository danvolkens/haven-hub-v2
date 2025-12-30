import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Default email templates based on Haven & Hold brand
const EMAIL_TEMPLATES = {
  welcome: [
    {
      position: 1,
      delay_hours: 0,
      name: 'Welcome + Lead Magnet Delivery',
      subject: 'Welcome to Haven & Hold 🌿',
      preview_text: 'Your space for quiet holding',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Welcome to the haven.</p>
<p>You've joined a community that believes spaces should hold us gently—that the words on our walls can do some of the work when we can't.</p>
<p>As a thank you for joining us, here's 15% off your first order:</p>
<p><strong>Code: WELCOME15</strong></p>
<p>Every print includes 16 sizes, instant download, and a guide to printing at home or at any local shop.</p>
<p>Held gently,<br>Haven & Hold</p>`,
      button_text: 'Browse the Collection',
      button_url: 'https://havenandhold.com/collections/all',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .code { background: #f0f4f1; padding: 12px 24px; border-radius: 4px; font-family: monospace; font-size: 18px; display: inline-block; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>Welcome to the haven.</p>

      <p>You've joined a community that believes spaces should hold us gently—that the words on our walls can do some of the work when we can't.</p>

      <p>As a thank you for joining us, here's 15% off your first order:</p>

      <p class="code">WELCOME15</p>

      <a href="https://havenandhold.com/collections/all" class="button">Browse the Collection</a>

      <p>Every print includes 16 sizes, instant download, and a guide to printing at home or at any local shop.</p>

      <p>Held gently,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 2,
      delay_hours: 48,
      name: 'Brand Story',
      subject: 'Why Haven & Hold exists',
      preview_text: 'It started with a blank wall...',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>A few years ago, I sat in my therapist's office staring at a quote on her wall:</p>
<blockquote>"You are allowed to be both a masterpiece and a work in progress."</blockquote>
<p>Something about those words in that space—a space that had witnessed so many hard moments—changed how I thought about what we put on our walls.</p>
<p>When I went looking for something similar for my own home, everything I found was either:</p>
<ul>
<li>Too clinical (felt like a doctor's office)</li>
<li>Too cliché (Live, Laugh, Love... no thank you)</li>
<li>Too aggressive (Rise and Grind! Be Unstoppable!)</li>
</ul>
<p>Where were the words for when you just needed permission to be held?</p>
<p>So I created Haven & Hold.</p>
<p><strong>Not motivation. Not inspiration. Just holding.</strong></p>
<p>For the spaces that witness your becoming.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Explore Our Story',
      button_url: 'https://havenandhold.com/pages/our-story',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .quote { font-style: italic; padding: 16px 24px; border-left: 3px solid #7c9082; margin: 24px 0; background: #f9f8f6; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>A few years ago, I sat in my therapist's office staring at a quote on her wall:</p>

      <div class="quote">"You are allowed to be both a masterpiece and a work in progress."</div>

      <p>Something about those words in that space—a space that had witnessed so many hard moments—changed how I thought about what we put on our walls.</p>

      <p>When I went looking for something similar for my own home, everything I found was either:</p>

      <ul>
        <li>Too clinical (felt like a doctor's office)</li>
        <li>Too cliché (Live, Laugh, Love... no thank you)</li>
        <li>Too aggressive (Rise and Grind! Be Unstoppable!)</li>
      </ul>

      <p>Where were the words for when you just needed permission to be held?</p>

      <p>So I created Haven & Hold.</p>

      <p><strong>Not motivation. Not inspiration. Just holding.</strong></p>

      <p>For the spaces that witness your becoming.</p>

      <a href="https://havenandhold.com/pages/our-story" class="button">Explore Our Story</a>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 3,
      delay_hours: 96,
      name: 'Best Sellers by Collection',
      subject: 'Three ways to hold yourself',
      preview_text: 'Grounding, Wholeness, or Growth?',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Everyone needs something different from their space.</p>
<p>That's why we organize our prints into three therapeutic collections:</p>
<p><strong>🔺 THE GROUNDING COLLECTION</strong><br>
For when you need stability, safety, an anchor. Words that remind you: you are held exactly where you are.</p>
<p><strong>⭕ THE WHOLENESS COLLECTION</strong><br>
For when you need self-compassion. Words that remind you: all of you belongs here.</p>
<p><strong>🌱 THE GROWTH COLLECTION</strong><br>
For when you're ready to transform. Words that remind you: still becoming is enough.</p>
<p>Not sure which speaks to you? Take our 2-minute quiz to find your perfect match.</p>
<p>Your 15% off code (WELCOME15) is still waiting.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Find Your Collection',
      button_url: 'https://havenandhold.com/pages/quiz',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .button-outline { display: inline-block; border: 2px solid #7c9082; color: #7c9082; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 8px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .collection { padding: 20px; margin: 16px 0; border-radius: 8px; }
    .grounding { background: #f0f4f1; }
    .wholeness { background: #e8f0f4; }
    .growth { background: #f4f8e8; }
    .collection h3 { margin: 0 0 8px 0; }
    .collection p { margin: 8px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>Everyone needs something different from their space.</p>

      <p>That's why we organize our prints into three therapeutic collections:</p>

      <div class="collection grounding">
        <h3>🌿 THE GROUNDING COLLECTION</h3>
        <p>For when you need stability and safety.</p>
        <p><strong>Bestseller:</strong> "You Are Held Here"</p>
        <a href="https://havenandhold.com/collections/grounding" class="button-outline">Shop Grounding</a>
      </div>

      <div class="collection wholeness">
        <h3>💙 THE WHOLENESS COLLECTION</h3>
        <p>For when you need self-compassion and acceptance.</p>
        <p><strong>Bestseller:</strong> "Held Gently, Held Wholly"</p>
        <a href="https://havenandhold.com/collections/wholeness" class="button-outline">Shop Wholeness</a>
      </div>

      <div class="collection growth">
        <h3>🌱 THE GROWTH COLLECTION</h3>
        <p>For when you're ready to transform and become.</p>
        <p><strong>Bestseller:</strong> "Held in Transition"</p>
        <a href="https://havenandhold.com/collections/growth" class="button-outline">Shop Growth</a>
      </div>

      <p>Not sure which speaks to you? Take our 2-minute Sanctuary Quiz:</p>

      <a href="https://havenandhold.com/pages/quiz" class="button">Take the Quiz</a>

      <p>Your WELCOME15 code is still waiting.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 4,
      delay_hours: 168,
      name: 'Social Proof + First Purchase Offer',
      subject: 'What customers are saying',
      preview_text: 'Real walls, real words',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>We wanted to share what others are saying about their Haven & Hold prints:</p>
<blockquote>"I hang 'You are held here' above my bed. On hard mornings, I look up before I look down." — Sarah M.</blockquote>
<blockquote>"My therapist actually asked where I got my print. Now it's in her office too." — Jennifer R.</blockquote>
<blockquote>"These aren't just decorations. They're daily reminders that I'm allowed to take up space." — Michelle K.</blockquote>
<p>Your WELCOME15 code expires in 48 hours.</p>
<p>Your sanctuary is waiting.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Use My Code',
      button_url: 'https://havenandhold.com/collections/all?discount=WELCOME15',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .testimonial { padding: 20px; margin: 16px 0; background: #f9f8f6; border-radius: 8px; font-style: italic; }
    .testimonial-author { font-style: normal; font-weight: bold; margin-top: 8px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>We asked our customers why they chose Haven & Hold.</p>

      <p>Here's what they said:</p>

      <div class="testimonial">
        "I hang 'You are held here' above my bed. On hard mornings, I look up before I look down."
        <div class="testimonial-author">— Sarah M.</div>
      </div>

      <div class="testimonial">
        "My therapist actually asked where I got my print. Now it's in her office too."
        <div class="testimonial-author">— Jennifer R.</div>
      </div>

      <div class="testimonial">
        "These aren't just decorations. They're daily reminders that I'm allowed to take up space."
        <div class="testimonial-author">— Michelle K.</div>
      </div>

      <p><strong>Your WELCOME15 code expires in 48 hours.</strong></p>

      <a href="https://havenandhold.com/collections/all" class="button">Use My Code</a>

      <p>Your sanctuary is waiting.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
  ],
  quiz_result: [
    {
      position: 1,
      delay_hours: 0,
      name: 'Your Quiz Results + Collection Recommendations',
      subject: 'Your Sanctuary Quiz results are in 🌿',
      preview_text: 'We found your perfect collection',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>You took our Sanctuary Quiz, and here's what we learned:</p>
<p><strong>Your result: THE {{ quiz_result|default:'GROUNDING'|upper }} COLLECTION</strong></p>
{% if quiz_result == 'grounding' %}
<p>Right now, you need stability. Safety. An anchor when everything feels uncertain.</p>
<p>The Grounding Collection speaks to the part of you that needs permission to stand still, to find solid ground, to simply be held exactly where you are.</p>
{% elif quiz_result == 'wholeness' %}
<p>Right now, you need self-compassion. Acceptance. Permission to embrace all of who you are.</p>
<p>The Wholeness Collection speaks to the part of you that's learning to hold space for every version of yourself—the messy, the beautiful, the becoming.</p>
{% else %}
<p>Right now, you're ready to transform. To become. To step into what's next.</p>
<p>The Growth Collection speaks to the part of you that's unfolding—honoring where you've been while reaching toward who you're becoming.</p>
{% endif %}
<p>Use code <strong>SANCTUARY15</strong> for 15% off your collection.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'See Your Collection',
      button_url: '{{ url|default:"https://havenandhold.com/collections/all" }}',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .result-box { padding: 24px; margin: 24px 0; background: #f0f4f1; border-radius: 8px; text-align: center; }
    .result-box h2 { margin: 0 0 8px 0; color: #7c9082; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>Thank you for taking our Sanctuary Quiz.</p>

      <p>Based on your answers, your therapeutic collection is:</p>

      <div class="result-box">
        <h2>{{ quiz_result|default:'Your Collection' }}</h2>
        <p>This collection was curated for exactly where you are right now.</p>
      </div>

      {% if quiz_result == 'Grounding' %}
      <p>The <strong>Grounding Collection</strong> is for those seeking stability, safety, and anchoring. These prints remind you that you have solid ground beneath your feet, even when everything feels uncertain.</p>
      {% elif quiz_result == 'Wholeness' %}
      <p>The <strong>Wholeness Collection</strong> is for those practicing self-compassion and acceptance. These prints remind you that you are complete, exactly as you are.</p>
      {% elif quiz_result == 'Growth' %}
      <p>The <strong>Growth Collection</strong> is for those in transformation and becoming. These prints honor the process of change while holding space for who you're becoming.</p>
      {% endif %}

      <a href="https://havenandhold.com/collections/{{ quiz_result|lower|default:'all' }}" class="button">Shop Your Collection</a>

      <p>As a thank you for taking the quiz, use code <strong>QUIZ15</strong> for 15% off your first order.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 2,
      delay_hours: 24,
      name: 'Deep Dive into Your Collection',
      subject: 'The story behind {{ quiz_result|default:"your collection" }}',
      preview_text: 'Why these words matter',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Yesterday we shared your Sanctuary Quiz results: <strong>The {{ quiz_result|default:'Grounding'|title }} Collection</strong>.</p>
<p>Today, let's go deeper into why these words might resonate.</p>
{% if quiz_result == 'grounding' %}
<p>The Grounding Collection was created for the moments when the world feels too fast, too loud, too much. When you need permission to simply stand still.</p>
<p>Each quote is a quiet anchor—words that remind you: you don't have to do anything to be worthy of rest.</p>
{% elif quiz_result == 'wholeness' %}
<p>The Wholeness Collection was created for those learning to make peace with all of who they are. The parts you show the world, and the parts you're still learning to accept.</p>
<p>Each quote is an invitation—words that remind you: you don't have to hide any part of yourself here.</p>
{% else %}
<p>The Growth Collection was created for those in transition. Between who you were and who you're becoming. In the beautiful, messy middle.</p>
<p>Each quote is an encouragement—words that remind you: transformation isn't linear, and you're exactly where you need to be.</p>
{% endif %}
<p>Your SANCTUARY15 code is still active.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Explore the Collection',
      button_url: '{{ url|default:"https://havenandhold.com/collections/all" }}',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>I wanted to share the story behind the {{ quiz_result|default:'collection' }} prints.</p>

      {% if quiz_result == 'Grounding' %}
      <p>The Grounding Collection was born from my own experience with anxiety. There were days when I felt untethered, like I might float away at any moment. I needed something physical to anchor me.</p>

      <p>The bestseller from this collection, "You Are Held Here," hangs in my bedroom. It's the first thing I see in the morning—a gentle reminder that the ground is still beneath me.</p>
      {% elif quiz_result == 'Wholeness' %}
      <p>The Wholeness Collection came from years of feeling like I was too much and not enough at the same time. These prints are love letters to the parts of ourselves we've been taught to hide.</p>

      <p>"Held Gently, Held Wholly" hangs in my reading nook. It's where I go when I need to remember that I don't have to earn my right to exist.</p>
      {% elif quiz_result == 'Growth' %}
      <p>The Growth Collection was created during my own season of transformation. Change is hard, even when it's chosen. These prints honor the space between who you were and who you're becoming.</p>

      <p>"Held in Transition" hangs in my home office. It reminds me that I'm allowed to be a work in progress.</p>
      {% endif %}

      <a href="https://havenandhold.com/collections/{{ quiz_result|lower|default:'all' }}" class="button">Explore {{ quiz_result|default:'the Collection' }}</a>

      <p>Your QUIZ15 code is still waiting.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 3,
      delay_hours: 72,
      name: 'Styled Room Inspiration',
      subject: 'Where to hang your {{ quiz_result|default:"" }} print',
      preview_text: 'Styling ideas for your space',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Wondering where to place your prints? Here's some inspiration from our community:</p>
<p><strong>Above the bed</strong> — The first words you see each morning, the last before sleep.</p>
<p><strong>Home office</strong> — A gentle reminder during the workday.</p>
<p><strong>Therapy waiting room</strong> — Yes, we have therapists who display our prints for their clients.</p>
<p><strong>Bathroom mirror</strong> — Small but powerful placement for daily affirmation.</p>
<p>The {{ quiz_result|default:'Grounding'|title }} Collection prints work beautifully in any of these spaces.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Shop Your Collection',
      button_url: '{{ url|default:"https://havenandhold.com/collections/all" }}',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .tip { padding: 16px; margin: 16px 0; background: #f9f8f6; border-radius: 8px; }
    .tip h4 { margin: 0 0 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>One of the most common questions we get is "Where should I hang my print?"</p>

      <p>Based on your {{ quiz_result|default:'collection' }} result, here are some ideas:</p>

      {% if quiz_result == 'Grounding' %}
      <div class="tip">
        <h4>🛏️ Bedroom</h4>
        <p>Above your bed, so it's the first thing you see when you wake and the last thing before sleep. Grounding prints help bookend your day with stability.</p>
      </div>

      <div class="tip">
        <h4>🚪 Entryway</h4>
        <p>Near the door you use most often. A grounding print here welcomes you home and reminds you that you have a safe space to return to.</p>
      </div>
      {% elif quiz_result == 'Wholeness' %}
      <div class="tip">
        <h4>📚 Reading Nook</h4>
        <p>In your quiet corner or favorite chair. Wholeness prints pair perfectly with moments of self-reflection and rest.</p>
      </div>

      <div class="tip">
        <h4>🪞 Near a Mirror</h4>
        <p>Somewhere you'll see it while getting ready. A wholeness print can transform your morning routine into a moment of self-compassion.</p>
      </div>
      {% elif quiz_result == 'Growth' %}
      <div class="tip">
        <h4>💼 Home Office</h4>
        <p>Where you do your work and dreaming. Growth prints remind you that progress isn't always linear, and that's okay.</p>
      </div>

      <div class="tip">
        <h4>🧘 Meditation Space</h4>
        <p>In your practice area, if you have one. Growth prints honor the journey of becoming.</p>
      </div>
      {% endif %}

      <a href="https://havenandhold.com/collections/{{ quiz_result|lower|default:'all' }}" class="button">Shop {{ quiz_result|default:'Now' }}</a>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 4,
      delay_hours: 120,
      name: 'Limited Time Offer for Your Collection',
      subject: '20% off {{ quiz_result|default:"your collection" }} — just for you',
      preview_text: 'Expires in 48 hours',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Your SANCTUARY15 code expires tonight at midnight.</p>
<p>If you've been thinking about bringing The {{ quiz_result|default:'Grounding'|title }} Collection into your space, now's the time.</p>
<p><strong>What you get:</strong></p>
<ul>
<li>Instant digital download</li>
<li>16 print sizes included (from 4×6" to 24×36")</li>
<li>Print guide with paper and frame recommendations</li>
<li>Lifetime access to your files</li>
</ul>
<p>No pressure. Just a gentle nudge if you're ready.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Use SANCTUARY15 Now',
      button_url: '{{ url|default:"https://havenandhold.com/collections/all" }}?discount=SANCTUARY15',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .offer-box { padding: 24px; margin: 24px 0; background: #f0f4f1; border-radius: 8px; text-align: center; }
    .code { font-family: monospace; font-size: 24px; font-weight: bold; color: #7c9082; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>This is a special thank you for taking the time to discover your therapeutic collection.</p>

      <div class="offer-box">
        <p>For the next 48 hours, take <strong>20% off</strong> any print from the {{ quiz_result|default:'collection' }} Collection.</p>

        {% if quiz_result == 'Grounding' %}
        <p class="code">GROUNDING20</p>
        {% elif quiz_result == 'Wholeness' %}
        <p class="code">WHOLENESS20</p>
        {% elif quiz_result == 'Growth' %}
        <p class="code">GROWTH20</p>
        {% else %}
        <p class="code">QUIZ20</p>
        {% endif %}
      </div>

      <a href="https://havenandhold.com/collections/{{ quiz_result|lower|default:'all' }}" class="button">Shop Now</a>

      <p>This code expires in 48 hours.</p>

      <p>Your sanctuary is waiting.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
  ],
  cart_abandonment: [
    {
      position: 1,
      delay_hours: 1,
      name: 'You left something behind',
      subject: 'You left something behind',
      preview_text: 'Your cart is still waiting',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Your sanctuary is waiting.</p>
<p>You left something in your cart, and we wanted to make sure you didn't forget.</p>
<p>{{ items|default:'Your selected prints are' }} still there whenever you're ready.</p>
<p>Need help deciding? Reply to this email—we're happy to help you find the perfect print for your space.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Complete Your Order',
      button_url: '{{ checkout_url|default:"https://havenandhold.com/cart" }}',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>Something pulled you away, and that's okay.</p>

      <p>Your cart is still here, holding space for you.</p>

      <p>When you're ready, your sanctuary is waiting:</p>

      <a href="{{ checkout_url|default:'https://havenandhold.com/cart' }}" class="button">Return to Cart</a>

      <p>No pressure, just a gentle reminder that beautiful words are waiting to become part of your space.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 2,
      delay_hours: 24,
      name: 'Still thinking about it?',
      subject: 'Still thinking about it?',
      preview_text: 'No pressure, just checking in',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Still thinking about those prints?</p>
<p>Here's a little something to help you decide:</p>
<p><strong>Code: COMEBACK10</strong> for 10% off your order.</p>
<p>One of our customers recently told us: "I kept putting off buying the print. When I finally did, I wondered why I waited so long. It's the first thing I see every morning."</p>
<p>Your cart is saved and ready when you are.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Use COMEBACK10',
      button_url: '{{ checkout_url|default:"https://havenandhold.com/cart" }}?discount=COMEBACK10',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .feature { padding: 12px 0; border-bottom: 1px solid #eee; }
    .feature:last-child { border-bottom: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>Decisions take time. We understand.</p>

      <p>In case it helps, here's what you get with every Haven & Hold print:</p>

      <div class="feature">✓ <strong>16 sizes included</strong> — from small desk print to large statement piece</div>
      <div class="feature">✓ <strong>Instant download</strong> — no waiting for shipping</div>
      <div class="feature">✓ <strong>Printing guide</strong> — we'll help you get the perfect print</div>
      <div class="feature">✓ <strong>Frame recommendations</strong> — curated options for every budget</div>

      <a href="{{ checkout_url|default:'https://havenandhold.com/cart' }}" class="button">Complete Your Order</a>

      <p>Questions? Just reply to this email—we're here to help.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 3,
      delay_hours: 72,
      name: 'Last chance + small discount',
      subject: 'A little something to help you decide',
      preview_text: '10% off, just for you',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Last chance—your cart will expire soon.</p>
<p>Your COMEBACK10 code is still active, but not for long.</p>
<p>If now isn't the right time, that's okay too. Your sanctuary will be here when you're ready.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Complete Order',
      button_url: '{{ checkout_url|default:"https://havenandhold.com/cart" }}?discount=COMEBACK10',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .offer-box { padding: 24px; margin: 24px 0; background: #f0f4f1; border-radius: 8px; text-align: center; }
    .code { font-family: monospace; font-size: 24px; font-weight: bold; color: #7c9082; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>Sometimes we just need a little nudge.</p>

      <div class="offer-box">
        <p>Here's <strong>10% off</strong> your cart:</p>
        <p class="code">COMEBACK10</p>
      </div>

      <a href="{{ checkout_url|default:'https://havenandhold.com/cart' }}" class="button">Complete Your Order</a>

      <p>This is our last reminder—your cart will clear soon.</p>

      <p>But we'll still be here if you decide to come back later. Your sanctuary isn't going anywhere.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
  ],
  post_purchase: [
    {
      position: 1,
      delay_hours: 0,
      name: 'Order Confirmation + What to Expect',
      subject: 'Your sanctuary is on its way 🌿',
      preview_text: 'Order confirmed',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Thank you for bringing Haven & Hold into your space. 💚</p>
<p><strong>Your order is confirmed.</strong></p>
<p>Your digital downloads are ready now—check your email for the download link, or access them anytime from your account.</p>
<p><strong>What's next:</strong></p>
<ol>
<li>Download your files (16 sizes included)</li>
<li>Choose your favorite size for your space</li>
<li>Print at home or any local print shop (we recommend Staples or FedEx)</li>
<li>Frame and hang in your sanctuary</li>
</ol>
<p>Need printing tips? We've got you covered in our next email.</p>
<p>Held gently,<br>Haven & Hold</p>`,
      button_text: 'Download Your Prints',
      button_url: '{{ download_url|default:"https://havenandhold.com/account" }}',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .order-box { padding: 24px; margin: 24px 0; background: #f0f4f1; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>Thank you for choosing Haven & Hold.</p>

      <div class="order-box">
        <p><strong>What's included in your download:</strong></p>
        <p>✓ 16 sizes (from 5x7 to 24x36)</p>
        <p>✓ High-resolution PDF files</p>
        <p>✓ Printing guide with tips</p>
        <p>✓ Frame recommendations</p>
      </div>

      <a href="{{ download_url|default:'#' }}" class="button">Download Your Files</a>

      <p>Your download link will also be in your Shopify account under Order History.</p>

      <p>Welcome to the haven.</p>

      <p>Held gently,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 2,
      delay_hours: 72,
      name: 'Care Instructions',
      subject: 'Getting the perfect print (quick guide)',
      preview_text: 'Printing tips',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Ready to print? Here's how to get gallery-quality results:</p>
<p><strong>Step 1: Choose your size</strong><br>
Your download includes 16 sizes. Pick the one that matches your frame or desired wall space.</p>
<p><strong>Step 2: Skip your home printer</strong><br>
For best results, take your file to Staples, FedEx Office, or a local print shop. Cost: $3-8.</p>
<p><strong>Step 3: Request matte cardstock</strong><br>
Say: "Please print this on matte cardstock, no cropping, no scaling." This gives you that premium gallery look.</p>
<p><strong>Step 4: Frame it</strong><br>
IKEA RIBBA frames are beautiful and affordable. Target and Amazon also have great options.</p>
<p>Questions? Just reply to this email.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'View Printing Guide',
      button_url: 'https://havenandhold.com/pages/how-it-works',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .step { padding: 16px 0; border-bottom: 1px solid #eee; }
    .step:last-child { border-bottom: none; }
    .step-number { display: inline-block; width: 28px; height: 28px; background: #7c9082; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; margin-right: 12px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>Ready to bring your print to life? Here's our quick guide to getting the perfect result:</p>

      <div class="step">
        <span class="step-number">1</span>
        <strong>Choose Your Size</strong>
        <p>Download the size that fits your space. Not sure? An 11x14 works beautifully above a nightstand, 16x20 for a gallery wall, or 24x36 for a statement piece.</p>
      </div>

      <div class="step">
        <span class="step-number">2</span>
        <strong>Where to Print</strong>
        <p>Our favorites: Costco Photo Center (best value), FedEx Office, Staples, or local print shops. Upload your file and pick up same day!</p>
      </div>

      <div class="step">
        <span class="step-number">3</span>
        <strong>Paper Choice</strong>
        <p>We recommend <strong>matte paper</strong> for that soft, therapeutic feel. Avoid glossy—it can create glare and feel too commercial.</p>
      </div>

      <div class="step">
        <span class="step-number">4</span>
        <strong>Frame It</strong>
        <p>A simple black, white, or natural wood frame lets the words shine. Target, IKEA, and Amazon all have great affordable options.</p>
      </div>

      <p>Questions? Just reply to this email—I'm here to help.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 3,
      delay_hours: 168,
      name: 'Request Review',
      subject: "How's your print looking?",
      preview_text: 'Share your space',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>How's your print looking on the wall?</p>
<p>We'd love to see it—and hear what you think.</p>
<p>If you have a moment, would you leave us a quick review? It helps other people find Haven & Hold, and we genuinely read every single one.</p>
<p>Bonus: Tag us on Instagram (@havenandhold) and you might be featured in our customer gallery.</p>
<p>Thank you for being part of this community.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Leave a Review',
      button_url: 'https://havenandhold.com/pages/reviews',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .button-outline { display: inline-block; border: 2px solid #7c9082; color: #7c9082; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 8px 4px; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>It's been about a week since your order. How's your print looking in its new home?</p>

      <p>We'd love to see it! Share a photo on Instagram and tag us <strong>@havenandhold</strong> for a chance to be featured in our customer gallery.</p>

      <p>And if you have a moment, a review means the world to us—it helps other people find the words they need for their walls:</p>

      <div style="text-align: center;">
        <a href="https://havenandhold.com/pages/review" class="button">Leave a Review</a>
      </div>

      <p>Thank you for being part of the haven.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 4,
      delay_hours: 336,
      name: 'Complementary Products',
      subject: 'Complete your sanctuary',
      preview_text: 'More for your walls',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Enjoying your prints?</p>
<p>Here are some pieces that pair beautifully with what you already have:</p>
<p>Whether you're building a gallery wall or finding prints for other rooms, we thought these might speak to you.</p>
<p>As a thank you for being a customer, here's <strong>10% off your next order</strong>:</p>
<p><strong>Code: THANKYOU10</strong></p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Shop More Prints',
      button_url: 'https://havenandhold.com/collections/all?discount=THANKYOU10',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .offer-box { padding: 24px; margin: 24px 0; background: #f0f4f1; border-radius: 8px; text-align: center; }
    .code { font-family: monospace; font-size: 24px; font-weight: bold; color: #7c9082; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>Now that you've started your sanctuary, you might be thinking about what comes next.</p>

      <p>Many of our customers create gallery walls with prints from different collections—Grounding in the bedroom, Growth in the office, Wholeness in the living room.</p>

      <p>As a thank you for being part of the haven, here's a little something for your next print:</p>

      <div class="offer-box">
        <p><strong>15% off your next order</strong></p>
        <p class="code">THANKYOU15</p>
      </div>

      <a href="https://havenandhold.com/collections/all" class="button">Continue Building Your Sanctuary</a>

      <p>No rush—this code doesn't expire.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
  ],
  win_back: [
    {
      position: 1,
      delay_hours: 0,
      name: 'We miss you + Special offer',
      subject: "It's been a while 💙",
      preview_text: 'Special offer inside',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>It's been a while. 💚</p>
<p>We've been adding new quotes to the collection, and we thought of you.</p>
<p>Your sanctuary might be ready for new words.</p>
<p>Come see what's new—and if anything speaks to you, use <strong>MISSYOU20</strong> for 20% off.</p>
<p>No pressure. Just an open door.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'See What\'s New',
      button_url: 'https://havenandhold.com/collections/all?discount=MISSYOU20',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .offer-box { padding: 24px; margin: 24px 0; background: #f0f4f1; border-radius: 8px; text-align: center; }
    .code { font-family: monospace; font-size: 24px; font-weight: bold; color: #7c9082; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>It's been a while since we've seen you.</p>

      <p>We've missed you in the haven.</p>

      <p>No pressure to come back—life gets full. But if you've been thinking about adding another print to your sanctuary, here's a little something:</p>

      <div class="offer-box">
        <p><strong>20% off your next order</strong></p>
        <p class="code">MISSYOU20</p>
      </div>

      <a href="https://havenandhold.com/collections/all" class="button">Visit the Haven</a>

      <p>Your sanctuary is still here, waiting to hold you.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 2,
      delay_hours: 72,
      name: "What's new since you left",
      subject: 'What you might have missed',
      preview_text: 'New arrivals',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Here's what's happened at Haven & Hold since we last saw you:</p>
<ul>
<li>New quotes added to all three collections</li>
<li>Customer favorites are now marked as bestsellers</li>
<li>We've been featured by therapists and wellness spaces</li>
</ul>
<p>Your MISSYOU20 code is still active—20% off anything in the shop.</p>
<p>We'd love to welcome you back.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Use MISSYOU20',
      button_url: 'https://havenandhold.com/collections/all?discount=MISSYOU20',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .new-item { padding: 16px 0; border-bottom: 1px solid #eee; }
    .new-item:last-child { border-bottom: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>A lot can happen in a few weeks. Here's what's new in the haven:</p>

      <div class="new-item">
        🌿 <strong>New Grounding Prints</strong>
        <p>Three new additions to help you feel anchored in uncertain times.</p>
      </div>

      <div class="new-item">
        💙 <strong>Wholeness Collection Expansion</strong>
        <p>More words for self-compassion, including our new bestseller.</p>
      </div>

      <div class="new-item">
        🌱 <strong>Growth Series</strong>
        <p>For anyone navigating change—seasonal transitions, life transitions, all of it.</p>
      </div>

      <a href="https://havenandhold.com/collections/new-arrivals" class="button">See What's New</a>

      <p>Your MISSYOU20 code is still waiting.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
    {
      position: 3,
      delay_hours: 168,
      name: 'Final reminder',
      subject: 'Last chance for 20% off',
      preview_text: 'Expires soon',
      content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Your MISSYOU20 code expires tonight at midnight.</p>
<p>If you've been thinking about adding new words to your walls, now's the time.</p>
<p>If not, no worries. We'll be here whenever you're ready.</p>
<p>Held,<br>Haven & Hold</p>`,
      button_text: 'Last Chance: 20% Off',
      button_url: 'https://havenandhold.com/collections/all?discount=MISSYOU20',
      html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f9f8f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { background: #fff; padding: 40px; border-radius: 8px; }
    .button { display: inline-block; background: #7c9082; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 24px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #666; }
    .offer-box { padding: 24px; margin: 24px 0; background: #f0f4f1; border-radius: 8px; text-align: center; }
    .code { font-family: monospace; font-size: 24px; font-weight: bold; color: #7c9082; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>{{ first_name|default:'Friend' }},</p>

      <p>Your 20% off code expires tomorrow.</p>

      <div class="offer-box">
        <p class="code">MISSYOU20</p>
        <p><em>Expires in 24 hours</em></p>
      </div>

      <a href="https://havenandhold.com/collections/all" class="button">Shop Now</a>

      <p>If now isn't the right time, that's okay too.</p>

      <p>We'll still be here whenever you're ready. Your haven isn't going anywhere.</p>

      <p>Held,<br>Haven & Hold</p>
    </div>
    <div class="footer">
      <p>Haven & Hold | Your space for quiet holding</p>
      <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
    },
  ],
};

// POST - Seed default email templates for the user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { flow_type, overwrite, update_content } = body;

    const flowTypes = flow_type
      ? [flow_type]
      : ['welcome', 'quiz_result', 'cart_abandonment', 'post_purchase', 'win_back'];

    const results: Array<{
      flow_type: string;
      created: number;
      updated: number;
      skipped: number;
      errors: string[];
    }> = [];

    for (const flowType of flowTypes) {
      const templates = EMAIL_TEMPLATES[flowType as keyof typeof EMAIL_TEMPLATES];
      if (!templates) {
        results.push({ flow_type: flowType, created: 0, updated: 0, skipped: 0, errors: [`Unknown flow type: ${flowType}`] });
        continue;
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const template of templates) {
        // Check if template already exists
        const { data: existing } = await (supabase as any)
          .from('email_templates')
          .select('id')
          .eq('user_id', user.id)
          .eq('flow_type', flowType)
          .eq('position', template.position)
          .single();

        if (existing && update_content) {
          // Only update content fields (for re-seeding existing templates)
          const { error } = await (supabase as any)
            .from('email_templates')
            .update({
              content_html: template.content_html,
              button_text: template.button_text,
              button_url: template.button_url,
            })
            .eq('id', existing.id);

          if (error) {
            errors.push(`Position ${template.position}: ${error.message}`);
          } else {
            updated++;
          }
          continue;
        }

        if (existing && !overwrite) {
          skipped++;
          continue;
        }

        // Create or update template
        const templateData = {
          user_id: user.id,
          flow_type: flowType,
          ...template,
        };

        if (existing && overwrite) {
          const { error } = await (supabase as any)
            .from('email_templates')
            .update(templateData)
            .eq('id', existing.id);

          if (error) {
            errors.push(`Position ${template.position}: ${error.message}`);
          } else {
            created++;
          }
        } else {
          const { error } = await (supabase as any)
            .from('email_templates')
            .insert(templateData);

          if (error) {
            errors.push(`Position ${template.position}: ${error.message}`);
          } else {
            created++;
          }
        }
      }

      results.push({ flow_type: flowType, created, updated, skipped, errors });
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    return NextResponse.json({
      message: `Seeded ${totalCreated} templates, updated ${totalUpdated}, skipped ${totalSkipped}, ${totalErrors} errors`,
      results,
    });
  } catch (error) {
    console.error('Error in POST /api/email-workflows/seed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Check seed status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const flowTypes = ['welcome', 'quiz_result', 'cart_abandonment', 'post_purchase', 'win_back'];
    const status: Record<string, { total: number; existing: number; expected: number }> = {};

    for (const flowType of flowTypes) {
      const expectedTemplates = EMAIL_TEMPLATES[flowType as keyof typeof EMAIL_TEMPLATES];
      const { count } = await (supabase as any)
        .from('email_templates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('flow_type', flowType);

      status[flowType] = {
        total: expectedTemplates?.length || 0,
        existing: count || 0,
        expected: expectedTemplates?.length || 0,
      };
    }

    const totalExpected = Object.values(status).reduce((sum, s) => sum + s.expected, 0);
    const totalExisting = Object.values(status).reduce((sum, s) => sum + s.existing, 0);

    return NextResponse.json({
      status,
      summary: {
        total_expected: totalExpected,
        total_existing: totalExisting,
        is_complete: totalExisting >= totalExpected,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/email-workflows/seed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
