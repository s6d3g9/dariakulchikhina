<template>
  <div class="asb-wrap">
    <div v-if="pending" class="asb-loading">Загрузка...</div>
    <template v-else>

      <!-- Section: Family -->
      <div class="asb-section">
        <div class="asb-section-title">состав семьи и образ жизни</div>
        <div class="asb-rows">
          <div v-for="f in familyFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-if="f.multi"
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              :placeholder="f.placeholder || ''"
              rows="2"
              @blur="save"
            />
            <select
              v-else-if="f.options"
              v-model="(form as any)[f.key]"
              class="asb-inp asb-select"
              @change="save"
            >
              <option value="">—</option>
              <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
            </select>
            <input
              v-else
              v-model="(form as any)[f.key]"
              class="asb-inp"
              type="text"
              :placeholder="f.placeholder || ''"
              @blur="save"
            >
          </div>
        </div>
      </div>

      <!-- Section: Routines -->
      <div class="asb-section">
        <div class="asb-section-title">ритуалы и распорядок</div>
        <div class="asb-rows">
          <div v-for="f in routineFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Style -->
      <div class="asb-section">
        <div class="asb-section-title">стиль и эстетика</div>
        <div class="asb-rows">
          <div v-for="f in styleFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-if="f.multi"
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
            <select
              v-else-if="f.options"
              v-model="(form as any)[f.key]"
              class="asb-inp asb-select"
              @change="save"
            >
              <option value="">—</option>
              <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
            </select>
            <input
              v-else
              v-model="(form as any)[f.key]"
              class="asb-inp"
              type="text"
              @blur="save"
            >
          </div>
        </div>
      </div>

      <!-- Section: Restrictions -->
      <div class="asb-section">
        <div class="asb-section-title">ограничения и особые условия</div>
        <div class="asb-rows">
          <div v-for="f in restrictFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Requirements -->
      <div class="asb-section">
        <div class="asb-section-title">
          требования к проекту
          <span v-if="form.objectType" class="asb-type-hint">{{ objectTypeLabel }}</span>
          <span v-else class="asb-type-hint asb-type-hint--warn">⚠ укажите тип объекта в параметрах (0.1) для точных тегов</span>
        </div>
        <div class="asb-checks-grid">
          <label v-for="req in filteredRequirements" :key="req.key" class="asb-check-item">
            <input
              type="checkbox"
              :checked="!!(form as any)[req.key]"
              @change="toggle(req.key)"
              class="asb-checkbox"
            >
            <span class="asb-check-label">{{ req.label }}</span>
            <span class="asb-check-tag">{{ req.tag }}</span>
          </label>
        </div>
      </div>

      <!-- Generated tags banner -->
      <div class="asb-tags-banner" v-if="autoTags.length">
        <span class="asb-tags-label">теги проекта:</span>
        <span v-for="tag in autoTags" :key="tag" class="asb-tag">{{ tag }}</span>
      </div>
      <div class="asb-tags-banner asb-tags-banner--empty" v-else>
        <span class="asb-tags-label">теги сформируются автоматически по ответам анкеты</span>
      </div>

      <!-- Footer -->
      <div class="asb-footer">
        <span v-if="savedAt" class="asb-saved">✓ сохранено {{ savedAt }}</span>
        <button class="asb-btn-save" @click="save" :disabled="saving">
          {{ saving ? 'сохранение...' : 'сохранить бриф' }}
        </button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const form = reactive<Record<string, any>>({})

watch(project, (p) => {
  if (p?.profile) {
    Object.assign(form, p.profile)
  }
}, { immediate: true })

// ── Requirements by object type ─────────────────────────────────
const ALL_REQUIREMENTS: Record<string, { key: string; label: string; tag: string }[]> = {
  // ── универсальные (любой тип) ───────────────────────────────────
  _common: [
    { key: 'brief_smart_home',       label: 'Умный дом',                  tag: '#smart_home'          },
    { key: 'brief_work_from_home',   label: 'Кабинет / работа дома',      tag: '#home_office'         },
    { key: 'brief_soundproofing',    label: 'Шумоизоляция',               tag: '#soundproofing'       },
    { key: 'brief_pets',             label: 'Питомцы',                    tag: '#pets_friendly'       },
    { key: 'brief_pet_zone',         label: 'Специальная зона для питомца',tag: '#pet_zone'           },
    { key: 'brief_pet_wash',         label: 'Мойка для животных',         tag: '#pet_wash'            },
    { key: 'brief_storage',          label: 'Много хранения',             tag: '#storage_plus'        },
    { key: 'brief_accessibility',    label: 'Доступная среда (МГН)',       tag: '#accessibility'       },
    { key: 'brief_climate',          label: 'Система климат-контроля',    tag: '#climate_control'     },
    { key: 'brief_biophilic',        label: 'Биофильный дизайн / растения',tag: '#biophilic'          },
    { key: 'brief_indoor_garden',    label: 'Зимний сад / фитостена',     tag: '#indoor_garden'       },
    { key: 'brief_natural_light',    label: 'Максимум естественного света',tag: '#natural_light'      },
    { key: 'brief_circadian_light',  label: 'Циркадное освещение',        tag: '#circadian_lighting'  },
    { key: 'brief_air_quality',      label: 'Очистка / рекуперация воздуха',tag: '#air_quality'       },
    { key: 'brief_water_filter',     label: 'Очистка воды',               tag: '#water_filtration'    },
    { key: 'brief_eco_materials',    label: 'Экологичные материалы',      tag: '#eco_materials'       },
    { key: 'brief_wellness',         label: 'Велнес / нейровелнес интерьер',tag: '#wellness_design'   },
    { key: 'brief_meditation',       label: 'Зона медитации / практик',   tag: '#meditation_zone'     },
    { key: 'brief_no_formaldehyde',  label: 'Без формальдегида / VOC',    tag: '#healthy_materials'   },
    { key: 'brief_guest_bedroom',    label: 'Гостевая спальня',           tag: '#guest_bedroom'       },
  ],
  // ── квартира ────────────────────────────────────────────────────
  apartment: [
    { key: 'brief_kids_room',        label: 'Детская / зоны детей',       tag: '#kids_room'           },
    { key: 'brief_kids_grow',        label: 'Мебель растёт с ребёнком',   tag: '#kids_grow_furniture' },
    { key: 'brief_home_gym',         label: 'Фитнес-зона',                tag: '#home_gym'            },
    { key: 'brief_home_cinema',      label: 'Домашний кинотеатр',         tag: '#home_cinema'         },
    { key: 'brief_chef_kitchen',     label: 'Проф. кухня',                tag: '#chef_kitchen'        },
    { key: 'brief_kitchen_island',   label: 'Кухонный остров',            tag: '#kitchen_island'      },
    { key: 'brief_sauna',            label: 'Хаммам / сауна',             tag: '#sauna_hammam'        },
    { key: 'brief_gallery',          label: 'Коллекция / галерея',        tag: '#art_gallery'         },
    { key: 'brief_walk_in_closet',   label: 'Гардеробная',                tag: '#walk_in_closet'      },
    { key: 'brief_balcony',          label: 'Балкон / лоджия',            tag: '#balcony'             },
    { key: 'brief_open_plan',        label: 'Открытая планировка',        tag: '#open_plan'           },
    { key: 'brief_master_bedroom',   label: 'Мастер-спальня',             tag: '#master_bedroom'      },
    { key: 'brief_library',          label: 'Библиотека / кабинет',       tag: '#home_library'        },
    { key: 'brief_panic_room',       label: 'Комната безопасности',       tag: '#panic_room'          },
    { key: 'brief_utility_room',     label: 'Постирочная / хозблок',      tag: '#utility_laundry'     },
    { key: 'brief_smart_bathroom',   label: 'Умная ванная',               tag: '#smart_bathroom'      },
    { key: 'brief_acoustic_panels',  label: 'Акустические панели',        tag: '#acoustic_panels'     },
    { key: 'brief_hidden_storage',   label: 'Скрытые системы хранения',   tag: '#hidden_storage'      },
    { key: 'brief_floor_heating',    label: 'Тёплые полы',                tag: '#floor_heating'       },
    { key: 'brief_dressing_room',    label: 'Отдельная примерочная',      tag: '#dressing_room'       },
  ],
  // ── пентхаус ────────────────────────────────────────────────────
  penthouse: [
    { key: 'brief_kids_room',        label: 'Детская',                    tag: '#kids_room'           },
    { key: 'brief_home_gym',         label: 'Тренажёрный зал',            tag: '#home_gym'            },
    { key: 'brief_home_cinema',      label: 'Домашний кинотеатр',         tag: '#home_cinema'         },
    { key: 'brief_chef_kitchen',     label: 'Проф. кухня',                tag: '#chef_kitchen'        },
    { key: 'brief_sauna',            label: 'Хаммам / сауна',             tag: '#sauna_hammam'        },
    { key: 'brief_gallery',          label: 'Коллекция / галерея',        tag: '#art_gallery'         },
    { key: 'brief_wine_cellar',      label: 'Винный погреб / бар',        tag: '#wine_cellar'         },
    { key: 'brief_walk_in_closet',   label: 'Гардеробная',                tag: '#walk_in_closet'      },
    { key: 'brief_master_bedroom',   label: 'Мастер-спальня',             tag: '#master_bedroom'      },
    { key: 'brief_rooftop_terrace',  label: 'Терраса на крыше',           tag: '#rooftop_terrace'     },
    { key: 'brief_rooftop_garden',   label: 'Сад на крыше',               tag: '#rooftop_garden'      },
    { key: 'brief_pool',             label: 'Бассейн / джакузи',          tag: '#pool_jacuzzi'        },
    { key: 'brief_library',          label: 'Библиотека / кабинет',       tag: '#home_library'        },
    { key: 'brief_open_plan',        label: 'Открытая планировка',        tag: '#open_plan'           },
    { key: 'brief_smart_bathroom',   label: 'Умная ванная',               tag: '#smart_bathroom'      },
    { key: 'brief_utility_room',     label: 'Постирочная',                tag: '#utility_laundry'     },
    { key: 'brief_staff_room',       label: 'Комната персонала',          tag: '#staff_quarters'      },
    { key: 'brief_hidden_storage',   label: 'Скрытые системы хранения',   tag: '#hidden_storage'      },
    { key: 'brief_acoustic_panels',  label: 'Акустические панели',        tag: '#acoustic_panels'     },
    { key: 'brief_floor_heating',    label: 'Тёплые полы',                tag: '#floor_heating'       },
  ],
  // ── частный дом / коттедж ───────────────────────────────────────
  house: [
    { key: 'brief_kids_room',        label: 'Детская',                    tag: '#kids_room'           },
    { key: 'brief_kids_grow',        label: 'Мебель растёт с ребёнком',   tag: '#kids_grow_furniture' },
    { key: 'brief_home_gym',         label: 'Тренажёрный зал',            tag: '#home_gym'            },
    { key: 'brief_home_cinema',      label: 'Кинозал',                    tag: '#home_cinema'         },
    { key: 'brief_chef_kitchen',     label: 'Проф. кухня',                tag: '#chef_kitchen'        },
    { key: 'brief_sauna',            label: 'Баня / сауна',               tag: '#sauna_house'         },
    { key: 'brief_wine_cellar',      label: 'Винный погреб',              tag: '#wine_cellar'         },
    { key: 'brief_fireplace',        label: 'Камин',                      tag: '#fireplace'           },
    { key: 'brief_pool',             label: 'Бассейн / хот-таб',          tag: '#pool_hottub'         },
    { key: 'brief_garage',           label: 'Гараж / мастерская',         tag: '#garage_workshop'     },
    { key: 'brief_ev_charging',      label: 'Зарядка для электромобиля',  tag: '#ev_charging'         },
    { key: 'brief_guest_house',      label: 'Гостевой дом',               tag: '#guest_house'         },
    { key: 'brief_garden',           label: 'Ландшафт / сад',             tag: '#garden'              },
    { key: 'brief_greenhouse',       label: 'Теплица / оранжерея',        tag: '#greenhouse'          },
    { key: 'brief_kitchen_garden',   label: 'Кухонный огород / грядки',   tag: '#kitchen_garden'      },
    { key: 'brief_kids_playground',  label: 'Детская площадка',           tag: '#kids_playground'     },
    { key: 'brief_bbq',              label: 'Барбекю / летняя кухня',     tag: '#bbq_summer'          },
    { key: 'brief_walk_in_closet',   label: 'Гардеробная',                tag: '#walk_in_closet'      },
    { key: 'brief_gallery',          label: 'Коллекция / галерея',        tag: '#art_gallery'         },
    { key: 'brief_library',          label: 'Библиотека / кабинет',       tag: '#home_library'        },
    { key: 'brief_home_automation',  label: 'Система безопасности',       tag: '#home_security'       },
    { key: 'brief_solar',            label: 'Солнечные панели / автономия',tag: '#solar_energy'       },
    { key: 'brief_rainwater',        label: 'Сбор дождевой воды',         tag: '#rainwater_harvest'   },
    { key: 'brief_animals_stable',   label: 'Конюшня / вольер',           tag: '#animals_stable'      },
    { key: 'brief_mud_room',         label: 'Грязный тамбур / раздевалка',tag: '#mud_room'            },
    { key: 'brief_staff_room',       label: 'Комната персонала',          tag: '#staff_quarters'      },
    { key: 'brief_smart_bathroom',   label: 'Умная ванная',               tag: '#smart_bathroom'      },
    { key: 'brief_utility_room',     label: 'Постирочная / хозблок',      tag: '#utility_laundry'     },
    { key: 'brief_floor_heating',    label: 'Тёплые полы',                tag: '#floor_heating'       },
    { key: 'brief_water_features',   label: 'Водные объекты (пруд/ручей)',tag: '#water_features'      },
    { key: 'brief_outdoor_shower',   label: 'Уличный душ',                tag: '#outdoor_shower'      },
  ],
  // ── таунхаус ────────────────────────────────────────────────────
  townhouse: [
    { key: 'brief_kids_room',        label: 'Детская',                    tag: '#kids_room'           },
    { key: 'brief_home_gym',         label: 'Фитнес-зона',                tag: '#home_gym'            },
    { key: 'brief_home_cinema',      label: 'Домашний кинотеатр',         tag: '#home_cinema'         },
    { key: 'brief_chef_kitchen',     label: 'Проф. кухня',                tag: '#chef_kitchen'        },
    { key: 'brief_sauna',            label: 'Хаммам / сауна',             tag: '#sauna_hammam'        },
    { key: 'brief_wine_cellar',      label: 'Винный погреб',              tag: '#wine_cellar'         },
    { key: 'brief_fireplace',        label: 'Камин',                      tag: '#fireplace'           },
    { key: 'brief_terrace',          label: 'Патио / терраса',            tag: '#terrace_patio'       },
    { key: 'brief_garage',           label: 'Гараж',                      tag: '#garage'              },
    { key: 'brief_ev_charging',      label: 'Зарядка для электромобиля',  tag: '#ev_charging'         },
    { key: 'brief_walk_in_closet',   label: 'Гардеробная',                tag: '#walk_in_closet'      },
    { key: 'brief_bbq',              label: 'Барбекю / зона отдыха',      tag: '#bbq_zone'            },
    { key: 'brief_library',          label: 'Кабинет',                    tag: '#home_library'        },
    { key: 'brief_mud_room',         label: 'Грязный тамбур',             tag: '#mud_room'            },
    { key: 'brief_utility_room',     label: 'Постирочная',                tag: '#utility_laundry'     },
    { key: 'brief_smart_bathroom',   label: 'Умная ванная',               tag: '#smart_bathroom'      },
    { key: 'brief_floor_heating',    label: 'Тёплые полы',                tag: '#floor_heating'       },
    { key: 'brief_hidden_storage',   label: 'Скрытые системы хранения',   tag: '#hidden_storage'      },
  ],
  // ── студия ──────────────────────────────────────────────────────
  studio: [
    { key: 'brief_transform_furn',   label: 'Трансформируемая мебель',    tag: '#transform_furniture' },
    { key: 'brief_max_storage',      label: 'Максимальное хранение',      tag: '#max_storage'         },
    { key: 'brief_hidden_storage',   label: 'Скрытые системы хранения',   tag: '#hidden_storage'      },
    { key: 'brief_sleeping_nook',    label: 'Отдельная зона сна',         tag: '#sleeping_nook'       },
    { key: 'brief_open_plan',        label: 'Умное зонирование',          tag: '#smart_zoning'        },
    { key: 'brief_home_cinema',      label: 'Мини-кинозона',              tag: '#home_cinema'         },
    { key: 'brief_work_from_home',   label: 'Рабочее место',              tag: '#work_nook'           },
    { key: 'brief_fold_bed',         label: 'Откидная кровать (Murphy)',  tag: '#murphy_bed'          },
    { key: 'brief_floor_heating',    label: 'Тёплые полы',                tag: '#floor_heating'       },
    { key: 'brief_smart_bathroom',   label: 'Умная ванная',               tag: '#smart_bathroom'      },
    { key: 'brief_kitchen_island',   label: 'Кухонный остров',            tag: '#kitchen_island'      },
  ],
  // ── офис ────────────────────────────────────────────────────────
  office: [
    { key: 'brief_meeting_rooms',    label: 'Переговорные',               tag: '#meeting_rooms'       },
    { key: 'brief_phone_booths',     label: 'Тихие кабины (phone booth)', tag: '#phone_booths'        },
    { key: 'brief_reception',        label: 'Зона ресепшн',               tag: '#reception'           },
    { key: 'brief_open_space',       label: 'Open space',                 tag: '#open_space'          },
    { key: 'brief_quiet_offices',    label: 'Тихие кабинеты',             tag: '#quiet_offices'       },
    { key: 'brief_kitchen_area',     label: 'Кухня / обед-зона',          tag: '#kitchen_area'        },
    { key: 'brief_server_room',      label: 'Серверная',                  tag: '#server_room'         },
    { key: 'brief_rest_area',        label: 'Зона отдыха / nap room',     tag: '#rest_area'           },
    { key: 'brief_acoustics',        label: 'Акустика',                   tag: '#acoustics'           },
    { key: 'brief_biophilic_office', label: 'Биофильный офис / растения', tag: '#biophilic_office'    },
    { key: 'brief_branding',         label: 'Фирменный стиль в дизайне',  tag: '#branded_interior'    },
    { key: 'brief_client_wc',        label: 'Санузел для клиентов',       tag: '#client_wc'           },
    { key: 'brief_security',         label: 'Контроль доступа',           tag: '#access_control'      },
    { key: 'brief_mothers_room',     label: 'Комната матери/ребёнка',     tag: '#mothers_room'        },
    { key: 'brief_shower_office',    label: 'Душ для сотрудников',        tag: '#staff_shower'        },
    { key: 'brief_activity_zones',   label: 'Activity-based рабочие места',tag: '#activity_based'     },
    { key: 'brief_lounge',           label: 'Лаунж / informal zones',     tag: '#lounge_area'         },
    { key: 'brief_ergonomics',       label: 'Эргономика рабочих мест',    tag: '#ergonomic_design'    },
  ],
  // ── коммерческое ────────────────────────────────────────────────
  commercial: [
    { key: 'brief_retail_floor',     label: 'Торговый зал',               tag: '#retail_floor'        },
    { key: 'brief_showcase',         label: 'Витрина / экспозиция',       tag: '#showcase'            },
    { key: 'brief_storage_room',     label: 'Склад / подсобка',           tag: '#storage_back'        },
    { key: 'brief_checkout',         label: 'Касса / ресепшн',            tag: '#checkout_desk'       },
    { key: 'brief_client_wc',        label: 'Санузел для клиентов',       tag: '#client_wc'           },
    { key: 'brief_branding',         label: 'Фирменный стиль',            tag: '#branded_interior'    },
    { key: 'brief_security',         label: 'Видеонаблюдение',            tag: '#cctv'                },
    { key: 'brief_acoustics',        label: 'Акустика',                   tag: '#acoustics'           },
    { key: 'brief_lounge',           label: 'Зона ожидания',              tag: '#lounge_area'         },
    { key: 'brief_kids_corner',      label: 'Детский уголок',             tag: '#kids_corner'         },
    { key: 'brief_accessibility_c',  label: 'Доступная среда',            tag: '#accessibility'       },
    { key: 'brief_photo_zone',       label: 'Фотозона / инсталляция',     tag: '#photo_zone'          },
    { key: 'brief_fitting_room',     label: 'Примерочные',                tag: '#fitting_rooms'       },
    { key: 'brief_staff_area',       label: 'Бэк-офис персонала',         tag: '#staff_area'          },
    { key: 'brief_charging_stations',label: 'Зарядки для гаджетов',       tag: '#charging_stations'   },
    { key: 'brief_digital_signage',  label: 'Digital-вывески / экраны',   tag: '#digital_signage'     },
  ],
}
  // ── квартира ────────────────────────────────────────────────────
  apartment: [
    { key: 'brief_kids_room',        label: 'Детская / зоны детей',  tag: '#kids_room'        },
    { key: 'brief_home_gym',         label: 'Фитнес-зона',           tag: '#home_gym'         },
    { key: 'brief_home_cinema',      label: 'Домашний кинотеатр',    tag: '#home_cinema'      },
    { key: 'brief_chef_kitchen',     label: 'Проф. кухня',           tag: '#chef_kitchen'     },
    { key: 'brief_sauna',            label: 'Хаммам / сауна',        tag: '#sauna_hammam'     },
    { key: 'brief_gallery',          label: 'Коллекция / галерея',   tag: '#art_gallery'      },
    { key: 'brief_walk_in_closet',   label: 'Гардеробная',           tag: '#walk_in_closet'   },
    { key: 'brief_balcony',          label: 'Балкон / лоджия',       tag: '#balcony'          },
    { key: 'brief_open_plan',        label: 'Открытая планировка',   tag: '#open_plan'        },
    { key: 'brief_master_bedroom',   label: 'Мастер-спальня',        tag: '#master_bedroom'   },
    { key: 'brief_library',          label: 'Библиотека / кабинет',  tag: '#home_library'     },
  ],
  // ── пентхаус ────────────────────────────────────────────────────
  penthouse: [
    { key: 'brief_kids_room',        label: 'Детская',               tag: '#kids_room'        },
    { key: 'brief_home_gym',         label: 'Тренажёрный зал',       tag: '#home_gym'         },
    { key: 'brief_home_cinema',      label: 'Домашний кинотеатр',    tag: '#home_cinema'      },
    { key: 'brief_chef_kitchen',     label: 'Проф. кухня',           tag: '#chef_kitchen'     },
    { key: 'brief_sauna',            label: 'Хаммам / сауна',        tag: '#sauna_hammam'     },
    { key: 'brief_gallery',          label: 'Коллекция / галерея',   tag: '#art_gallery'      },
    { key: 'brief_wine_cellar',      label: 'Винный погреб / бар',   tag: '#wine_cellar'      },
    { key: 'brief_walk_in_closet',   label: 'Гардеробная',           tag: '#walk_in_closet'   },
    { key: 'brief_master_bedroom',   label: 'Мастер-спальня',        tag: '#master_bedroom'   },
    { key: 'brief_rooftop_terrace',  label: 'Терраса на крыше',      tag: '#rooftop_terrace'  },
    { key: 'brief_pool',             label: 'Бассейн / джакузи',     tag: '#pool_jacuzzi'     },
    { key: 'brief_library',          label: 'Библиотека / кабинет',  tag: '#home_library'     },
    { key: 'brief_open_plan',        label: 'Открытая планировка',   tag: '#open_plan'        },
  ],
  // ── частный дом / коттедж ───────────────────────────────────────
  house: [
    { key: 'brief_kids_room',        label: 'Детская',               tag: '#kids_room'        },
    { key: 'brief_home_gym',         label: 'Тренажёрный зал',       tag: '#home_gym'         },
    { key: 'brief_home_cinema',      label: 'Кинозал',               tag: '#home_cinema'      },
    { key: 'brief_chef_kitchen',     label: 'Проф. кухня',           tag: '#chef_kitchen'     },
    { key: 'brief_sauna',            label: 'Баня / сауна',          tag: '#sauna_house'      },
    { key: 'brief_wine_cellar',      label: 'Винный погреб',         tag: '#wine_cellar'      },
    { key: 'brief_fireplace',        label: 'Камин',                 tag: '#fireplace'        },
    { key: 'brief_pool',             label: 'Бассейн / хот-таб',     tag: '#pool_hottub'      },
    { key: 'brief_garage',           label: 'Гараж / мастерская',    tag: '#garage_workshop'  },
    { key: 'brief_guest_house',      label: 'Гостевой дом',          tag: '#guest_house'      },
    { key: 'brief_garden',           label: 'Ландшафт / сад',        tag: '#garden'           },
    { key: 'brief_greenhouse',       label: 'Теплица / оранжерея',   tag: '#greenhouse'       },
    { key: 'brief_kids_playground',  label: 'Детская площадка',      tag: '#kids_playground'  },
    { key: 'brief_bbq',              label: 'Барбекю / летняя кухня',tag: '#bbq_summer'       },
    { key: 'brief_walk_in_closet',   label: 'Гардеробная',           tag: '#walk_in_closet'   },
    { key: 'brief_gallery',          label: 'Коллекция / галерея',   tag: '#art_gallery'      },
    { key: 'brief_library',          label: 'Библиотека / кабинет',  tag: '#home_library'     },
    { key: 'brief_home_automation',  label: 'Система безопасности',  tag: '#home_security'    },
  ],
  // ── таунхаус ────────────────────────────────────────────────────
  townhouse: [
    { key: 'brief_kids_room',        label: 'Детская',               tag: '#kids_room'        },
    { key: 'brief_home_gym',         label: 'Фитнес-зона',           tag: '#home_gym'         },
    { key: 'brief_home_cinema',      label: 'Домашний кинотеатр',    tag: '#home_cinema'      },
    { key: 'brief_chef_kitchen',     label: 'Проф. кухня',           tag: '#chef_kitchen'     },
    { key: 'brief_sauna',            label: 'Хаммам / сауна',        tag: '#sauna_hammam'     },
    { key: 'brief_wine_cellar',      label: 'Винный погреб',         tag: '#wine_cellar'      },
    { key: 'brief_fireplace',        label: 'Камин',                 tag: '#fireplace'        },
    { key: 'brief_terrace',          label: 'Патио / терраса',       tag: '#terrace_patio'    },
    { key: 'brief_garage',           label: 'Гараж',                 tag: '#garage'           },
    { key: 'brief_walk_in_closet',   label: 'Гардеробная',           tag: '#walk_in_closet'   },
    { key: 'brief_bbq',              label: 'Барбекю / зона отдыха', tag: '#bbq_zone'         },
    { key: 'brief_library',          label: 'Кабинет',               tag: '#home_library'     },
  ],
  // ── студия ──────────────────────────────────────────────────────
  studio: [
    { key: 'brief_transform_furn',   label: 'Трансформируемая мебель', tag: '#transform_furniture' },
    { key: 'brief_max_storage',      label: 'Максимальное хранение', tag: '#max_storage'      },
    { key: 'brief_sleeping_nook',    label: 'Отдельная зона сна',    tag: '#sleeping_nook'    },
    { key: 'brief_open_plan',        label: 'Умное зонирование',     tag: '#smart_zoning'     },
    { key: 'brief_home_cinema',      label: 'Мини-кинозона',         tag: '#home_cinema'      },
    { key: 'brief_work_from_home',   label: 'Рабочее место',         tag: '#work_nook'        },
  ],
  // ── офис ────────────────────────────────────────────────────────
  office: [
    { key: 'brief_meeting_rooms',    label: 'Переговорные',          tag: '#meeting_rooms'    },
    { key: 'brief_reception',        label: 'Зона ресепшн',          tag: '#reception'        },
    { key: 'brief_open_space',       label: 'Open space',            tag: '#open_space'       },
    { key: 'brief_quiet_offices',    label: 'Тихие кабинеты',        tag: '#quiet_offices'    },
    { key: 'brief_kitchen_area',     label: 'Кухня / обед-зона',     tag: '#kitchen_area'     },
    { key: 'brief_server_room',      label: 'Серверная',             tag: '#server_room'      },
    { key: 'brief_rest_area',        label: 'Зона отдыха',           tag: '#rest_area'        },
    { key: 'brief_acoustics',        label: 'Акустика',              tag: '#acoustics'        },
    { key: 'brief_branding',         label: 'Фирменный стиль в дизайне', tag: '#branded_interior' },
    { key: 'brief_client_wc',        label: 'Санузел для клиентов',  tag: '#client_wc'        },
    { key: 'brief_security',         label: 'Контроль доступа',      tag: '#access_control'   },
  ],
  // ── коммерческое ────────────────────────────────────────────────
  commercial: [
    { key: 'brief_retail_floor',     label: 'Торговый зал',          tag: '#retail_floor'     },
    { key: 'brief_showcase',         label: 'Витрина / экспозиция',  tag: '#showcase'         },
    { key: 'brief_storage_room',     label: 'Склад / подсобка',      tag: '#storage_back'     },
    { key: 'brief_checkout',         label: 'Касса / ресепшн',       tag: '#checkout_desk'    },
    { key: 'brief_client_wc',        label: 'Санузел для клиентов',  tag: '#client_wc'        },
    { key: 'brief_branding',         label: 'Фирменный стиль',       tag: '#branded_interior' },
    { key: 'brief_security',         label: 'Видеонаблюдение',       tag: '#cctv'             },
    { key: 'brief_acoustics',        label: 'Акустика',              tag: '#acoustics'        },
    { key: 'brief_lounge',           label: 'Зона ожидания',         tag: '#lounge_area'      },
  ],
}

// объединяем universal + тип объекта
const OBJECT_TYPE_LABELS: Record<string, string> = {
  apartment:  'квартира',
  penthouse:  'пентхаус',
  house:      'частный дом',
  townhouse:  'таунхаус',
  studio:     'студия',
  office:     'офис',
  commercial: 'коммерческое',
}
const objectTypeLabel = computed(() => OBJECT_TYPE_LABELS[form.objectType] || form.objectType)

// объединяем universal + тип объекта
const filteredRequirements = computed(() => {
  const objType = form.objectType || ''
  const specific = ALL_REQUIREMENTS[objType] || ALL_REQUIREMENTS.apartment
  const common = ALL_REQUIREMENTS._common
  // дедупликация по key
  const seen = new Set(specific.map(r => r.key))
  return [...specific, ...common.filter(r => !seen.has(r.key))]
})

const autoTags = computed(() =>
  filteredRequirements.value.filter(r => form[r.key]).map(r => r.tag)
)

function toggle(key: string) {
  form[key] = !form[key]
  save()
}

// ── Form field definitions ────────────────────────────────────────
const familyFields = [
  { key: 'brief_adults_count',    label: 'Взрослых в семье', placeholder: 'например: 2' },
  { key: 'brief_kids_ages',       label: 'Дети (возраст)',   placeholder: 'например: 4 и 8 лет' },
  { key: 'brief_pets_desc',       label: 'Питомцы',          placeholder: 'порода, размер' },
  { key: 'brief_remote_work',     label: 'Удалённая работа', options: ['нет', 'частично', 'постоянно', 'оба партнёра'] },
  { key: 'brief_guests_freq',     label: 'Частота гостей',   options: ['редко', 'несколько раз в месяц', 'еженедельно', 'постоянно'] },
  { key: 'brief_hobbies',         label: 'Хобби и увлечения', placeholder: 'музыка, живопись, спорт...', multi: true },
]

const routineFields = [
  { key: 'brief_morning_routine', label: 'Утренний ритуал', placeholder: 'кофе в тишине, утренняя пробежка, завтрак всей семьёй...' },
  { key: 'brief_evening_routine', label: 'Вечерний ритуал', placeholder: 'кино, ужин с гостями, чтение, йога...' },
  { key: 'brief_cooking_role',    label: 'Роль кухни',      placeholder: 'готовим сами, заказываем, профессиональная готовка...' },
  { key: 'brief_bedroom_needs',   label: 'Спальня / сон',   placeholder: 'раздельные спальни, звукоизоляция, электрошторы...' },
]

const styleFields = [
  { key: 'brief_style_prefer',    label: 'Стиль',          options: ['минимализм', 'скандинавский', 'контемпорари', 'ар-деко', 'неоклассика', 'лофт', 'японский', 'без предпочтений'] },
  { key: 'brief_color_mood',      label: 'Цветовая гамма', options: ['светлая нейтральная', 'тёплая земляная', 'тёмная насыщенная', 'контрастная', 'без предпочтений'] },
  { key: 'brief_like_refs',       label: 'Нравится (ссылки / описание)', multi: true, placeholder: 'ссылки на Pinterest, описание...' },
  { key: 'brief_dislike_refs',    label: 'Не нравится',               multi: true, placeholder: 'что точно нельзя...' },
  { key: 'brief_material_prefs',  label: 'Материалы',                  multi: true, placeholder: 'натуральный камень, дерево, металл...' },
]

const restrictFields = [
  { key: 'brief_allergies',       label: 'Аллергии / чувствительность', placeholder: 'на запахи, пыль, материалы...' },
  { key: 'brief_deadlines_hard',  label: 'Жёсткие сроки',               placeholder: 'дата заезда, мероприятие...' },
  { key: 'brief_budget_limits',   label: 'Бюджетные ограничения',       placeholder: 'не превышать по категориям...' },
  { key: 'brief_special_notes',   label: 'Особые пожелания',            placeholder: 'любые важные детали...' },
]

// ── Save ──────────────────────────────────────────────────────────
const saving = ref(false)
const savedAt = ref('')

async function save() {
  saving.value = true
  try {
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: { profile: { ...project.value?.profile, ...form } }
    })
    const now = new Date()
    savedAt.value = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.asb-wrap { padding: 4px 0 48px; }
.asb-loading { font-size: .88rem; color: #999; }

/* Tags banner */
.asb-tags-banner {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  padding: 12px 16px; margin-bottom: 24px;
  border: 1px solid var(--border, #e0e0e0);
  background: var(--surface, #fafafa);
}
.asb-tags-banner--empty { opacity: .55; }
.asb-tags-label { font-size: .72rem; color: #999; letter-spacing: .6px; text-transform: uppercase; margin-right: 6px; white-space: nowrap; }
.asb-tag {
  font-size: .76rem; padding: 3px 10px;
  background: var(--text, #1a1a1a); color: var(--bg, #fff);
  border-radius: 2px; font-family: monospace; letter-spacing: .3px;
}

/* Sections */
.asb-section { margin-bottom: 32px; }
.asb-section-title {
  font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: #999;
  margin-bottom: 14px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #ececec);
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.asb-type-hint {
  font-size: .7rem; text-transform: none; letter-spacing: 0;
  background: #eef2ff; color: #4f46e5; padding: 2px 8px; border-radius: 10px; font-weight: 500;
}
.asb-type-hint--warn { background: #fff7ed; color: #b45309; }

/* Checkboxes grid */
.asb-checks-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px 16px;
}
.asb-check-item {
  display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 0;
}
.asb-checkbox { width: 14px; height: 14px; cursor: pointer; accent-color: var(--text, #1a1a1a); flex-shrink: 0; }
.asb-check-label { font-size: .82rem; color: var(--text, #333); flex: 1; }
.asb-check-tag { font-size: .68rem; font-family: monospace; color: #aaa; white-space: nowrap; }

/* Form rows */
.asb-rows { display: flex; flex-direction: column; gap: 4px; }
.asb-row {
  display: grid; grid-template-columns: 160px 1fr; align-items: start;
  padding: 8px 0; border-bottom: 1px solid var(--border, #f0f0f0);
}
.asb-row:last-child { border-bottom: none; }
.asb-lbl { font-size: .76rem; color: #888; padding-top: 6px; }
.asb-inp {
  border: none; border-bottom: 1px solid var(--border, #ddd);
  padding: 6px 0; font-size: .88rem; background: transparent; outline: none;
  font-family: inherit; color: var(--text, inherit); width: 100%;
}
.asb-inp:focus { border-bottom-color: var(--text, #1a1a1a); }
.asb-ta { resize: vertical; min-height: 36px; }
.asb-select { appearance: none; cursor: pointer; }

/* Footer */
.asb-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 16px;
  padding-top: 20px; border-top: 1px solid var(--border, #ececec); margin-top: 8px;
}
.asb-saved { font-size: .76rem; color: #9d9; }
.asb-btn-save {
  border: 1px solid var(--text, #1a1a1a); background: var(--text, #1a1a1a);
  color: var(--bg, #fff); padding: 10px 24px; font-size: .85rem;
  cursor: pointer; font-family: inherit;
}
.asb-btn-save:disabled { opacity: .55; cursor: default; }
.asb-btn-save:hover:not(:disabled) { opacity: .85; }
</style>
