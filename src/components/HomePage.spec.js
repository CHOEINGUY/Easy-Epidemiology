import { mount } from '@vue/test-utils';
import HomePage from './HomePage.vue';
import { siteConfig } from '../config/siteConfig';

// Mock the siteConfig module
jest.mock('@/config/siteConfig', () => ({
  loadSiteConfig: jest.fn(() => ({
    basic: {
      title: 'Test Title',
      subtitle: 'Test Subtitle',
      description: 'Test Description',
      version: 'v0.1',
      lastUpdate: '2025-01-01',
      platform: 'Test Platform',
    },
    features: [
      {
        icon: '🧪',
        title: 'Test Feature',
        description: 'Test Feature Description',
      },
    ],
    systemFeatures: ['Test System Feature'],
    targetUsers: [{ name: 'Test User', type: 'test' }],
    education: {
      timeline: [
        {
          title: 'Test Education',
          subtitle: 'Test Subtitle',
        },
      ],
      highlight: 'Test Highlight',
    },
    organization: {
      name: 'Test Org',
      department: 'Test Dept',
      center: 'Test Center',
      team: [{ role: 'Test Role', name: 'Test Name' }],
    },
    quickGuide: [
      {
        step: 1,
        title: 'Test Step',
        description: 'Test Step Description',
      },
    ],
    contact: {
      title: 'Test Contact',
      organization: 'Test Org',
      department: 'Test Dept',
    },
  })),
}));

describe('HomePage.vue', () => {
  it('renders correctly with mocked config', () => {
    const wrapper = mount(HomePage);
    // Check if the component was mounted
    expect(wrapper.exists()).toBe(true);

    // Check if the title from the mocked config is rendered
    expect(wrapper.find('.hero-title').text()).toBe('Test Title');
  });
});
