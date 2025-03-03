DIST_DIR := dist
SRC_ROOT := src
SETS_DIRNAME := sets
SETS_DIR := $(SRC_ROOT)/$(SETS_DIRNAME)
LIB_DIR := $(SRC_ROOT)/lib
LIB_BSPS_DIR := $(LIB_DIR)/bsps
COMMON_DIR := common

# regex to exclude sets from bundle
EXCLUDE := discovery|architecture

# main .alf files
SRC_ALFS := $(shell find $(SETS_DIR) -regex '$(SETS_DIR)/[^/][^/]*/alf/[^/][^/]*\.alf')
OUT_ALFS := $(subst $(SETS_DIR),$(DIST_DIR),$(SRC_ALFS))

SRC_SET_JSONS := $(shell find $(SETS_DIR) -name 'set.json')
OUT_SET_JSONS := $(subst $(SETS_DIR),$(DIST_DIR),$(SRC_SET_JSONS))

SET_BSPS := $(shell find $(SETS_DIR) -regex '.*/bsps/[^/][^/]*\.json')
OUT_SET_BSPS := $(subst $(SETS_DIR),$(DIST_DIR),$(SET_BSPS))

SET_DIRS := $(shell find $(SETS_DIR) -depth 1 -regex '.*/[^/][^/]*/[^\.]..*')
LIB_BSPS := $(shell find $(LIB_BSPS_DIR) -name '*.json' | cut -d / -f3-)
OUT_LIB_BSPS := $(subst $(SETS_DIR), $(DIST_DIR), $(foreach a, $(SET_DIRS), $(foreach b, $(LIB_BSPS), $a/$b)))

SRC_OGGS := $(shell find $(SETS_DIR) -regex '.*/ogg/[^/][^/]*\.ogg')
OUT_OGGS := $(subst $(SETS_DIR),$(DIST_DIR),$(SRC_OGGS))

REPO_NAME := $(shell basename `git rev-parse --show-toplevel`)
CUR_DATE := $(shell date +%Y%m%d)
GIT_SHA := $(shell git rev-parse --short HEAD)
BUNDLE_PREFIX := $(REPO_NAME)-$(CUR_DATE)-$(GIT_SHA)

TAG_NAME := release-$(GIT_SHA)

$(DIST_DIR)/%.json: $(wildcard $(SETS_DIR)/*/bsps/*) \
$(wildcard $(SETS_DIR)/*/*) \
$(wildcard $(LIB_BSPS_DIR)/*)
	@mkdir -p $(@D)
	$(eval LIB_BSP_FILE := $(LIB_BSPS_DIR)/$(notdir $@))
	@if [ -e '$(LIB_BSP_FILE)' ]; then \
		if [ ! -e '$@' -o '$(LIB_BSP_FILE)' -nt '$@' ]; then \
			echo 'Copying $(LIB_BSP_FILE) -> $@...'; \
			cp $(LIB_BSP_FILE) $@; \
		fi \
	elif [ ! -e '$@' -o '$(SETS_DIR)/$*.json' -nt '$@' ]; then \
		echo 'Copying $(SETS_DIR)/$*.json -> $@...'; \
		cp $(SETS_DIR)/$*.json $@; \
	fi

$(DIST_DIR)/%.ogg: $(SETS_DIR)/%.ogg
	@mkdir -p $(@D)
	@echo 'Copying $(SETS_DIR)/$*.ogg -> $@...'
	@cp $(SETS_DIR)/$*.ogg $@

.SECONDEXPANSION:
$(DIST_DIR)/%.alf: $(SETS_DIR)/%.alf \
$$(wildcard $$(SETS_DIR)/$$*/*) \
$$(wildcard $$(shell echo $(SETS_DIR)/$$* | rev | cut -d / -f3- | rev)/$(COMMON_DIR)/*) \
$(wildcard $(LIB_DIR)/*.alf $(LIB_DIR)/*/*.alf) \
alf_globals.py
	@mkdir -p $(@D)
	@python dist.py $(OPTS) $(SETS_DIRNAME)/$*.alf $@

all: $(OUT_ALFS) $(OUT_OGGS) $(OUT_SET_BSPS) $(OUT_LIB_BSPS) $(OUT_SET_JSONS)

SRC_SET_DIRS := $(shell find $(SETS_DIR) -maxdepth 1 -regex '$(SETS_DIR)/..*')
DIST_SET_DIRS := $(subst $(SETS_DIR),$(DIST_DIR),$(SRC_SET_DIRS))
SET_SYMLINKS := $(subst $(DIST_DIR),$(APP_LEVELS_PATH),$(DIST_SET_DIRS))

$(APP_LEVELS_PATH)/%: $(DIST_DIR)/%
	ln -s $(shell realpath $^) $@

symlinks: $(SET_SYMLINKS)

bundle: all
	find $(DIST_DIR) -regex '^$(DIST_DIR)/[^/][^/]*' | grep -E '$(EXCLUDE)' | xargs rm -r
	mv $(DIST_DIR) $(BUNDLE_PREFIX)
	zip -r $(BUNDLE_PREFIX).zip $(BUNDLE_PREFIX)
	mv $(BUNDLE_PREFIX) $(DIST_DIR)

release:
	git tag $(TAG_NAME)
	git push origin tag $(TAG_NAME)

.PHONY: all clean symlinks bundle release

clean:
	@rm -rf $(DIST_DIR)
	@echo Done.
