export interface Quote {
  id: number;
  text: string;
  author: string;
  category: 'ancient' | 'leader';
}

export const FAMOUS_QUOTES: Quote[] = [
  // Ancient Philosophers
  { id: 1, text: "You have power over your mind - not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius", category: "ancient" },
  { id: 2, text: "We suffer more often in imagination than in reality.", author: "Seneca", category: "ancient" },
  { id: 3, text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus", category: "ancient" },
  { id: 4, text: "The unexamined life is not worth living.", author: "Socrates", category: "ancient" },
  { id: 5, text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle", category: "ancient" },
  { id: 6, text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle", category: "ancient" },
  { id: 7, text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu", category: "ancient" },
  { id: 8, text: "He will win who knows when to fight and when not to fight.", author: "Sun Tzu", category: "ancient" },
  { id: 9, text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", category: "ancient" },
  { id: 10, text: "No man ever steps in the same river twice, for it's not the same river and he's not the same man.", author: "Heraclitus", category: "ancient" },
  { id: 11, text: "If you have a garden and a library, you have everything you need.", author: "Cicero", category: "ancient" },
  { id: 12, text: "He has the most who is content with the least.", author: "Diogenes", category: "ancient" },
  { id: 13, text: "Man conquers the world by conquering himself.", author: "Zeno of Citium", category: "ancient" },
  { id: 14, text: "Do not spoil what you have by desiring what you have not.", author: "Epicurus", category: "ancient" },
  { id: 15, text: "Silence is better than unmeaning words.", author: "Pythagoras", category: "ancient" },
  { id: 16, text: "The most difficult thing in life is to know yourself.", author: "Thales", category: "ancient" },
  { id: 17, text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch", category: "ancient" },
  { id: 18, text: "Withdraw into yourself and look.", author: "Plotinus", category: "ancient" },
  { id: 19, text: "Happiness is the absence of the striving for happiness.", author: "Chuang Tzu", category: "ancient" },
  { id: 20, text: "The great man is he who does not lose his child's-heart.", author: "Mencius", category: "ancient" },
  { id: 21, text: "Fate leads the willing and drags the unwilling.", author: "Cleanthes", category: "ancient" },
  { id: 22, text: "Happiness resides not in possessions, and not in gold, happiness dwells in the soul.", author: "Democritus", category: "ancient" },
  { id: 23, text: "You will earn respect if you begin by respecting yourself.", author: "Musonius Rufus", category: "ancient" },
  { id: 24, text: "Reserve your right to think, for even to think wrongly is better than not to think at all.", author: "Hypatia", category: "ancient" },
  { id: 25, text: "Who looks outside, dreams; who looks inside, awakes.", author: "Carl Jung", category: "ancient" },

  // Global Leaders & Modern Thinkers
  { id: 26, text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi", category: "leader" },
  { id: 27, text: "It always seems impossible until it's done.", author: "Nelson Mandela", category: "leader" },
  { id: 28, text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", category: "leader" },
  { id: 29, text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln", category: "leader" },
  { id: 30, text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt", category: "leader" },
  { id: 31, text: "Darkness cannot drive out darkness; only light can do that.", author: "Martin Luther King Jr.", category: "leader" },
  { id: 32, text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein", category: "leader" },
  { id: 33, text: "You will face many defeats in life, but never let yourself be defeated.", author: "Maya Angelou", category: "leader" },
  { id: 34, text: "The only thing we have to fear is fear itself.", author: "Franklin D. Roosevelt", category: "leader" },
  { id: 35, text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "leader" },
  { id: 36, text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "leader" },
  { id: 37, text: "When we are no longer able to change a situation, we are challenged to change ourselves.", author: "Viktor Frankl", category: "leader" },
  { id: 38, text: "The wound is the place where the Light enters you.", author: "Rumi", category: "leader" },
  { id: 39, text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche", category: "leader" },
  { id: 40, text: "Talent hits a target no one else can hit; Genius hits a target no one else can see.", author: "Arthur Schopenhauer", category: "leader" },
  { id: 41, text: "All things excellent are as difficult as they are rare.", author: "Baruch Spinoza", category: "leader" },
  { id: 42, text: "Look closely. The beautiful may be small.", author: "Immanuel Kant", category: "leader" },
  { id: 43, text: "Judge a man by his questions rather than by his answers.", author: "Voltaire", category: "leader" },
  { id: 44, text: "I think, therefore I am.", author: "René Descartes", category: "leader" },
  { id: 45, text: "Knowledge is power.", author: "Francis Bacon", category: "leader" },
  { id: 46, text: "Out of suffering have emerged the strongest souls; the most massive characters are seared with scars.", author: "Kahlil Gibran", category: "leader" },
  { id: 47, text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson", category: "leader" },
  { id: 48, text: "Go confidently in the direction of your dreams! Live the life you've imagined.", author: "Henry David Thoreau", category: "leader" },
  { id: 49, text: "Magic is believing in yourself, if you can do that, you can make anything happen.", author: "Johann Wolfgang von Goethe", category: "leader" },
  { id: 50, text: "Turn your wounds into wisdom.", author: "Oprah Winfrey", category: "leader" },
];
