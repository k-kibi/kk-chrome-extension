let main = (character) => {
  let form = document.querySelector('form[name="say"]');
  let talkPreview = new TalkPreview(form, character);
  form.appendChild(talkPreview.previewArea);
  talkPreview.init();

  let eventListener = (event) => {
    let form = event.currentTarget.parentNode.parentNode.parentNode.nextSibling.nextSibling.querySelector('form');
    let talkPreview = new TalkPreview(form, character);
    form.appendChild(talkPreview.previewArea);
    talkPreview.init();

    event.currentTarget.removeEventListener('click', eventListener);
  };

  for (let btn of document.querySelectorAll('a.RE')) {
    btn.parentNode.addEventListener('click', eventListener);
  }
};

new Character(main);
