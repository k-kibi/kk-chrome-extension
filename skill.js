let main = (character) => {
  document.querySelectorAll('tr.SED').forEach((tr, index, array) => {
    let td = tr.querySelector('td');
    let messagePreview = new MessagePreview(td, character);
    td.appendChild(messagePreview.previewArea);
  });
};

new Character(main);
