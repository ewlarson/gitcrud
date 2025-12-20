import { describe, it, expect } from 'vitest';
import { resourceToJson, resourceFromJson, Resource } from './model';

describe('Aardvark Model', () => {
    it('should roundtrip simple resource', () => {
        const r: Resource = {
            id: 'test-1',
            dct_title_s: 'Test Title',
            dct_accessRights_s: 'Public',
            gbl_mdVersion_s: 'Aardvark',
            dct_description_sm: ['Desc 1', 'Desc 2'],
            gbl_resourceClass_sm: ['Dataset'],
            dct_alternative_sm: [],
            dct_language_sm: [],
            gbl_displayNote_sm: [],
            dct_creator_sm: [],
            dct_publisher_sm: [],
            gbl_resourceType_sm: [],
            dct_subject_sm: [],
            dcat_theme_sm: [],
            dcat_keyword_sm: [],
            dct_temporal_sm: [],
            gbl_dateRange_drsim: [],
            dct_spatial_sm: [],
            dct_identifier_sm: [],
            dct_rights_sm: [],
            dct_rightsHolder_sm: [],
            dct_license_sm: [],
            pcdm_memberOf_sm: [],
            dct_isPartOf_sm: [],
            dct_source_sm: [],
            dct_isVersionOf_sm: [],
            dct_replaces_sm: [],
            dct_relation_sm: [],
            extra: {}
        };

        const json = resourceToJson(r);
        expect(json['dct_title_s']).toBe('Test Title');
        expect(json['dct_description_sm']).toEqual(['Desc 1', 'Desc 2']);

        // Roundtrip
        const r2 = resourceFromJson(json);
        expect(r2.id).toBe(r.id);
        expect(r2.dct_description_sm).toEqual(r.dct_description_sm);
    });
});
