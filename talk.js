let main = (character) => {
  let form = document.querySelector('form[name="say"]');
  let talkPreview = new TalkPreview(form, character);
  form.appendChild(talkPreview.previewArea);
  talkPreview.init();

  for (let btn of document.querySelectorAll('a.RE')) {
    btn.parentNode.addEventListener('click', (event) => {
      let form = event.currentTarget.parentNode.parentNode.parentNode.nextSibling.nextSibling.querySelector('form');
      let talkPreview = new TalkPreview(form, character);
      form.appendChild(talkPreview.previewArea);
      talkPreview.init();
    });
  }
};

new Character(main);
