document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-button');
  const contentPanels = document.querySelectorAll('.content-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all tabs and panels
      tabs.forEach(t => t.classList.remove('active'));
      contentPanels.forEach(panel => panel.classList.remove('active'));

      // Activate the clicked tab and corresponding panel
      tab.classList.add('active');
      const targetPanelId = tab.getAttribute('data-tab');
      const targetPanel = document.getElementById(targetPanelId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
});
