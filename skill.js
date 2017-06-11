let main = (character) => {
  document.querySelectorAll('tr.SED').forEach((tr, index, array) => {
    let td = tr.querySelector('td');
    let messagePreview = new MessagePreview(td, character);
    td.appendChild(messagePreview.previewArea);
    messagePreview.init();

    let stagingPreview = new StagingPreview(td);
    td.appendChild(stagingPreview.previewArea);
    stagingPreview.init();
  });

  for (let select of document.querySelectorAll('select[name^="ss"]')) {
    let td = select.parentNode;
    let ssm = new SkillSerifMemo(td);
    ssm.init();
  }
};

new Character(main);
