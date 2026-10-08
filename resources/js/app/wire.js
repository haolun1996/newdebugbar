/**
 * The server calls the shell modules make through `this.$wire`.
 *
 * Each call reads JSON from the package API, stores what the UI needs, and then
 * announces the result with the same `newdebugbar-*` window events the shell listens to.
 */
export function createWire({ api, shell, dispatch, nextTick }) {
  const emit = (name, detail = {}) => dispatch(new CustomEvent(name, { detail }));

  return {
    async loadInspector(inspector) {
      const profileId = shell().summary.id;
      const response = await api.inspector(profileId, inspector);

      if (shell().summary.id !== profileId) return;

      shell().inspectorData = Object.freeze({
        profileId,
        inspector,
        profile: response.profile,
      });
      await nextTick();
      emit('newdebugbar-inspector-loaded', { inspector, profileId });
      emit('newdebugbar-content-updated');
    },

    async refreshRelatedActivity() {
      const response = await api.related(shell().summary.id);

      emit('newdebugbar-profile-refreshed', {
        summary: response.summary,
        relatedProfiles: response.related_profiles ?? [],
      });
    },

    async loadRecentProfiles() {
      emit('newdebugbar-recent-profiles-loaded', { profiles: await api.recent() });
    },

    async switchProfile(profileId) {
      emit('newdebugbar-profile-switched', { summary: await api.summary(profileId) });
    },

    async noticeProfile(profileId) {
      emit('newdebugbar-profile-noticed', { summary: await api.notice(profileId) });
    },
  };
}
