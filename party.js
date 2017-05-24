let main = (character) => {
  document.querySelectorAll('tr.LG').forEach((tr, index, array) => {
    let td = tr.querySelector('td');
    let messagePreview = new MessagePreview(td, character);
    let separator = document.createElement('div');
    separator.className = 'CL';
    td.appendChild(separator);
    td.appendChild(messagePreview.previewArea);
  });
};

new Character(main);
