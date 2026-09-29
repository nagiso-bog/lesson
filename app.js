const form = document.querySelector(".form");
const input = document.querySelector(".text");
const btn = document.querySelector(".btn");
const list = document.querySelector(".list");
form.addEventListener("submit", function (e) {
  e.preventDefault();
  const data = input.value;
  const item = document.createElement("li");
  const p = document.createElement("p");
  p.textContent = data;
  list.append(item);
  item.append(p);
  input.value = "";
  p.addEventListener("click", () => {
    p.classList.add("line");
  });
  p.addEventListener("dblclick", () => {
    p.remove();
  });
});
