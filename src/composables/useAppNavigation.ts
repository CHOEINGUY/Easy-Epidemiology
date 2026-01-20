import { ref, computed, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useEpidemicStore } from '@/stores/epidemicStore';
import { showConfirmToast } from '@/components/DataInputVirtualScroll/logic/toast';

export function useAppNavigation(isAuthenticated: any, isAdmin: any, requiresAuth: any) {
  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const epidemicStore = useEpidemicStore();

  const currentRouteName = computed(() => route.name);

  const baseTabs = computed(() => [
    { name: "DataInputVirtual", label: t("nav.dataInput"), icon: "table_chart" },
    { name: "PatientCharacteristics", label: t("nav.patientCharacteristics"), icon: "accessibility_new" },
    { name: "EpidemicCurve", label: t("nav.epidemicCurve"), icon: "show_chart" },
    { name: "ClinicalSymptoms", label: t("nav.clinicalSymptoms"), icon: "sick" },
    { name: "CaseControl", label: t("nav.caseControl"), icon: "compare_arrows" },
    { name: "CohortStudy", label: t("nav.cohortStudy"), icon: "groups" },
    { name: "CaseSeries", label: t("nav.caseSeries"), icon: "list_alt" },
    { name: "ReportWriter", label: t("nav.reportWriter"), icon: "edit_note" },
    { name: "HomePage", label: t("nav.webpageInfo"), icon: "info" },
  ]);

  const tabs = computed(() => {
    const tArr = [...baseTabs.value];
    if (requiresAuth.value && isAdmin.value) {
      tArr.push({
        name: "AdminPanel",
        label: t("nav.adminPanel"),
        icon: "admin_panel_settings",
      });
    }
    return tArr;
  });

  const showTabs = computed(() => {
    return (
      currentRouteName.value !== "Login" &&
      (!requiresAuth.value || isAuthenticated.value)
    );
  });

  const contentClass = computed(() => {
    const classes = ["content"];
    if (
      ["DataInputVirtual", "ReportWriter", "UserManual"].includes(
        currentRouteName.value as string
      )
    ) {
      classes.push("no-scroll");
    } else {
      classes.push("scrollable");
    }
    return classes.join(" ");
  });

  const tabRefs = ref<Record<string, HTMLElement | null>>({});
  const scrollContainer = ref<HTMLElement | null>(null);

  const setTabRef = (el: unknown, name: string) => {
    if (el) tabRefs.value[name] = el as HTMLElement;
  };

  function handleTabClick(routeName: string) {
    if (
      currentRouteName.value === "DataInputVirtual" &&
      routeName !== "DataInputVirtual"
    ) {
      const validationErrors = epidemicStore.validationState.errors;
      const hasErrors = validationErrors && validationErrors.size > 0;

      if (hasErrors) {
        const confirmMessage = t("common.tabChangeConfirm", {
          count: validationErrors.size,
        });
        showConfirmToast(confirmMessage).then((confirmed) => {
          if (confirmed) {
            router.push({ name: routeName });
          }
        });
      } else {
        router.push({ name: routeName });
      }
    } else {
      router.push({ name: routeName });
    }
  }

  // Auto-scroll logic watcher
  watch(
    currentRouteName,
    async (newVal) => {
      await nextTick();
      const el = tabRefs.value[newVal as string];
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    },
    { immediate: true }
  );

  return {
    tabs,
    showTabs,
    contentClass,
    currentRouteName,
    scrollContainer,
    setTabRef,
    handleTabClick
  };
}
