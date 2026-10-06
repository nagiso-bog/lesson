const STORAGE_KEY = "insta-clone-state";
const ME = "me";

// The icon shapes are <symbol> elements at the top of index.html
const icon = (name) => `<svg viewBox="0 0 24 24"><use href="#icon-${name}"/></svg>`;
const avatarUrl = (n) => `https://i.pravatar.cc/150?img=${n}`;
const photoUrl = (seed, size = 800) => `https://picsum.photos/seed/${seed}/${size}/${size}`;

const USERS = {
  me: { username: "your_account", avatar: avatarUrl(12) },
  anna: { username: "anna.travels", avatar: avatarUrl(5), story: photoUrl("story-anna", 900) },
  max: { username: "max_codes", avatar: avatarUrl(11), story: photoUrl("story-max", 900) },
  lena: { username: "lena.foodie", avatar: avatarUrl(9), story: photoUrl("story-lena", 900) },
  tom: { username: "tom.shots", avatar: avatarUrl(15), story: photoUrl("story-tom", 900) },
  mia: { username: "mia_draws", avatar: avatarUrl(20), story: photoUrl("story-mia", 900) },
  alex: { username: "alex.fit", avatar: avatarUrl(33), story: photoUrl("story-alex", 900) },
  kate: { username: "kate.designs", avatar: avatarUrl(44), story: photoUrl("story-kate", 900) },
};
const STORY_USERS = Object.keys(USERS).filter((id) => USERS[id].story);

// Demo posts: author, photo, caption, likes, time, comments
const SEED_POSTS = [
  ["anna", "mountains", "Woke up above the clouds today ⛰️", 1284, "2h", [["max", "This view is unreal!"], ["lena", "Take me with you next time"]]],
  ["max", "desk", "New setup, same bugs 🐛", 342, "4h", [["tom", "Clean setup!"]]],
  ["lena", "pasta", "Homemade pasta night 🍝", 876, "6h", [["anna", "Recipe please!"], ["mia", "Looks delicious"]]],
  ["tom", "street", "Golden hour in the city", 2150, "9h", []],
  ["mia", "sketch", "Sketchbook page 42 ✏️", 513, "12h", [["kate", "Love the linework"]]],
  ["me", "coffee", "First coffee, then code ☕", 97, "1d", [["max", "The only correct order"]]],
  ["alex", "run", "10k before breakfast 🏃", 430, "1d", []],
  ["kate", "poster", "Poster concept for a client", 691, "2d", [["mia", "The colors!"]]],
  ["me", "sunset", "No filter needed", 164, "3d", []],
  ["anna", "beach", "Salt in the air", 1740, "5d", []],
].map(([userId, seed, caption, likes, time, comments], i) => ({
  id: i + 1, userId, image: photoUrl(seed), caption, likes, time,
  comments: comments.map(([user, text]) => ({ user, text })),
}));

// ---------- State ----------
let state = { posts: SEED_POSTS, seen: [] };
let storyIndex = 0;
let newImage = null;

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  // Skip saved posts whose author is no longer in USERS
  if (saved) state = { posts: saved.posts.filter((p) => USERS[p.userId]), seen: saved.seen || [] };
} catch {} // broken or blocked storage: the demo posts stay

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {} // storage is full (large photos): the page keeps working, just without saving
}

const $ = (selector, root = document) => root.querySelector(selector);
const getPost = (id) => state.posts.find((p) => p.id === Number(id));
const postId = (el) => el.closest(".post").dataset.post;
const escapeHtml = (text) => text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

// ---------- Rendering ----------
function postHTML(post, full = false) {
  const user = USERS[post.userId];
  const comments = full ? post.comments : post.comments.slice(-2);
  return `
    <article class="post" data-post="${post.id}" data-full="${full ? 1 : 0}">
      <div class="post__head">
        <img class="avatar" src="${user.avatar}" alt="">
        <span class="post__user">${user.username}</span>
        <span class="post__time">${post.time}</span>
        ${post.userId === ME ? `<button class="post__delete" data-action="delete" title="Delete post">${icon("trash")}</button>` : ""}
      </div>
      <div class="post__media">
        <img src="${post.image}" alt="${escapeHtml(post.caption)}" loading="lazy" draggable="false">
        <div class="post__burst">${icon("heart")}</div>
      </div>
      <div class="post__actions">
        <button class="${post.liked ? "is-liked" : ""}" data-action="like" aria-label="Like">${icon("heart")}</button>
        <button data-action="focus-comment" aria-label="Comment">${icon("comment")}</button>
        <button data-action="share" aria-label="Copy link">${icon("share")}</button>
        <button class="post__save ${post.saved ? "is-saved" : ""}" data-action="save" aria-label="Save">${icon("bookmark")}</button>
      </div>
      <div class="post__body">
        <p class="post__likes">${post.likes.toLocaleString("en-US")} likes</p>
        ${post.caption ? `<p class="post__caption"><b>${user.username}</b>${escapeHtml(post.caption)}</p>` : ""}
        ${comments.length < post.comments.length ? `<button class="post__more" data-action="open">View all ${post.comments.length} comments</button>` : ""}
        <div class="post__comments">
          ${comments.map((c) => `<p class="comment"><b>${USERS[c.user].username}</b>${escapeHtml(c.text)}</p>`).join("")}
        </div>
        <form class="comment-form">
          <input type="text" name="comment" placeholder="Add a comment..." maxlength="200" autocomplete="off">
          <button type="submit" class="link-btn" disabled>Post</button>
        </form>
      </div>
    </article>`;
}

function renderStories() {
  $("#stories").innerHTML = STORY_USERS.map((id, i) => `
    <button class="story-chip ${state.seen.includes(id) ? "is-seen" : ""}" data-action="story" data-index="${i}">
      <span class="story-chip__ring"><img class="avatar" src="${USERS[id].avatar}" alt=""></span>
      <span class="story-chip__name">${USERS[id].username}</span>
    </button>`).join("");
}

function renderFeed() {
  $("#posts").innerHTML = state.posts.map((p) => postHTML(p)).join("");
}

// ---------- Posts ----------
// Change one post, save it and redraw it everywhere it is shown (feed and modal)
function updatePost(id, change) {
  const post = getPost(id);
  change(post);
  saveState();
  document.querySelectorAll(`.post[data-post="${id}"]`).forEach((el) => {
    el.outerHTML = postHTML(post, el.dataset.full === "1");
  });
}

function toggleLike(post) {
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
}

function deletePost(id) {
  if (!confirm("Delete this post?")) return;
  state.posts = state.posts.filter((p) => p.id !== Number(id));
  saveState();
  closeModals();
  renderFeed();
}

function openPost(id) {
  $("#postModalBody").innerHTML = postHTML(getPost(id), true);
  $("#postModal").hidden = false;
}

function closeModals() {
  $("#postModal").hidden = $("#createModal").hidden = true;
}

// ---------- New post ----------
function openCreate() {
  newImage = null;
  $("#createForm").reset();
  $("#createPreview").hidden = true;
  $("#createHint").hidden = false;
  $("#shareBtn").disabled = true;
  $("#createModal").hidden = false;
}

// Shrink the photo so it fits into localStorage
async function readImage(file) {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();
  const scale = Math.min(1, 1080 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(img.src);
  return canvas.toDataURL("image/jpeg", 0.82);
}

$("#fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    newImage = await readImage(file);
  } catch {
    return alert("Could not read this image.");
  }
  $("#createPreview").src = newImage;
  $("#createPreview").hidden = false;
  $("#createHint").hidden = true;
  $("#shareBtn").disabled = false;
});

$("#createForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!newImage) return;
  const caption = $("#captionInput").value.trim();
  state.posts.unshift({ id: Date.now(), userId: ME, image: newImage, caption, likes: 0, time: "now", comments: [] });
  saveState();
  closeModals();
  renderFeed();
  window.scrollTo(0, 0);
});

// ---------- Stories ----------
function showStory(index) {
  if (index >= STORY_USERS.length) return closeStory();
  storyIndex = Math.max(index, 0);
  const id = STORY_USERS[storyIndex];
  $("#storyImg").src = USERS[id].story;
  $("#storyAvatar").src = USERS[id].avatar;
  $("#storyUser").textContent = USERS[id].username;
  $("#storyViewer").hidden = false;
  // A new element starts the 5 second animation of the progress bar from zero
  $("#storyBar").innerHTML = "<span></span>";
  if (state.seen.includes(id)) return;
  state.seen.push(id);
  saveState();
}

function closeStory() {
  $("#storyViewer").hidden = true;
  renderStories();
}

// When the progress bar is full, the next story opens
$("#storyBar").addEventListener("animationend", () => showStory(storyIndex + 1));

// ---------- Events ----------
// What a click on an element with data-action="..." does
const actions = {
  home: () => window.scrollTo(0, 0),
  create: openCreate,
  "close-modal": closeModals,
  like: (button) => updatePost(postId(button), toggleLike),
  save: (button) => updatePost(postId(button), (post) => (post.saved = !post.saved)),
  "focus-comment": (button) => $("input", button.closest(".post")).focus(),
  share(button) {
    navigator.clipboard?.writeText(`${location.href.split("#")[0]}#post-${postId(button)}`)?.catch(() => {});
    button.title = "Link copied";
  },
  open: (button) => openPost(postId(button)),
  delete: (button) => deletePost(postId(button)),
  story: (button) => showStory(Number(button.dataset.index)),
  "story-prev": () => showStory(storyIndex - 1),
  "story-next": () => showStory(storyIndex + 1),
  "story-close": closeStory,
};

document.addEventListener("click", (e) => {
  // Click on the dark backdrop closes the modal
  if (e.target.matches(".modal")) return closeModals();
  const button = e.target.closest("[data-action]");
  if (button) actions[button.dataset.action](button);
});

// Double click on a photo = like with a heart
document.addEventListener("dblclick", (e) => {
  const media = e.target.closest(".post__media");
  if (!media) return;
  const id = postId(media);
  updatePost(id, (post) => post.liked || toggleLike(post));
  document.querySelectorAll(`.post[data-post="${id}"] .post__media`).forEach((el) => el.classList.add("is-burst"));
});

// The "Post" button is enabled only when there is some text
document.addEventListener("input", (e) => {
  if (e.target.name === "comment") $("button", e.target.form).disabled = !e.target.value.trim();
});

document.addEventListener("submit", (e) => {
  if (!e.target.matches(".comment-form")) return;
  e.preventDefault();
  const text = e.target.comment.value.trim();
  if (text) updatePost(postId(e.target), (post) => post.comments.push({ user: ME, text }));
});

document.addEventListener("keydown", (e) => {
  const storyOpen = !$("#storyViewer").hidden;
  if (e.key === "Escape") storyOpen ? closeStory() : closeModals();
  if (storyOpen && e.key === "ArrowRight") showStory(storyIndex + 1);
  if (storyOpen && e.key === "ArrowLeft") showStory(storyIndex - 1);
});

// ---------- Init ----------
document.querySelectorAll("[data-icon]").forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
renderStories();
renderFeed();
