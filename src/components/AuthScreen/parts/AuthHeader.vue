<template>
  <div class="header-section">
    <h2 class="form-title">
      {{ title }}
    </h2>
  </div>
</template>

<script>
export default {
  name: 'AuthHeader',
  props: {
    title: {
      type: String,
      default: '로그인'
    }
  }
};
</script>

<style scoped>
.header-section {
  margin-bottom: 8px;
}

.form-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}
</style>
