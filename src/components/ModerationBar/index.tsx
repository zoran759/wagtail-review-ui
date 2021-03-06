import * as React from 'react';

import { Store } from '../../state';
import {
    ModerationState,
    ModerationStatus,
    ModerationErrorCode
} from '../../state/moderation';
import APIClient from '../../api';

import {
    updateModerationState,
    setErrors,
    clearError
} from '../../actions/moderation';

interface ModerationBarProps extends ModerationState {
    store: Store;
    api: APIClient;
}

export default class ModerationBar extends React.Component<ModerationBarProps> {
    renderModal() {
        if (!this.props.statusBoxOpen) {
            return <></>;
        }

        let validate = (): boolean => {
            let errors: Set<ModerationErrorCode> = new Set();

            if (this.props.status === null) {
                errors.add('status-required');
            }

            if (this.props.comment.length == 0) {
                errors.add('comment-required');
            }

            if (this.props.comment.length > 200) {
                errors.add('comment-too-long');
            }

            this.props.store.dispatch(setErrors(errors));

            return errors.size == 0;
        };

        let setStatusOnChange = (status: ModerationStatus) => {
            return (e: React.ChangeEvent<HTMLInputElement>) => {
                e.preventDefault();
                this.props.store.dispatch(updateModerationState({ status }));

                if (status !== null && 'status-required' in this.props.errors) {
                    this.props.store.dispatch(clearError('status-required'));
                }
            };
        };

        let onChangeComment = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            e.preventDefault();
            this.props.store.dispatch(
                updateModerationState({ comment: e.target.value })
            );

            if (
                e.target.value.length > 0 &&
                'comment-required' in this.props.errors
            ) {
                this.props.store.dispatch(clearError('comment-required'));
            }

            if (
                e.target.value.length <= 200 &&
                'comment-too-long' in this.props.errors
            ) {
                this.props.store.dispatch(clearError('comment-too-long'));
            }
        };

        let onSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();

            if (!validate()) {
                return;
            }

            this.props.store.dispatch(
                updateModerationState({
                    statusBoxOpen: false,
                    submitStage: 'submitting'
                })
            );

            await this.props.api.submitModerationResponse(
                this.props.status,
                this.props.comment
            );

            // TODO handle error
            this.props.store.dispatch(
                updateModerationState({ submitStage: 'submitted' })
            );
        };

        let statusErrors = <></>;
        if (this.props.errors.has('status-required')) {
            statusErrors = <div className="error">This field is required.</div>;
        }

        let reasonErrors = <></>;
        if (this.props.errors.has('comment-required')) {
            reasonErrors = <div className="error">This field is required.</div>;
        } else if (this.props.errors.has('comment-too-long')) {
            reasonErrors = (
                <div className="error">
                    This field is too long (200 characters maximum).
                </div>
            );
        }

        return (
            <div className="moderation-bar__modal">
                <div
                    className="status"
                    data-error={this.props.errors.has('status-required')}
                >
                    <p>Please select a status</p>
                    <input
                        type="radio"
                        id="approved"
                        checked={this.props.status === 'approved'}
                        onChange={setStatusOnChange('approved')}
                    />
                    <label htmlFor="approved">Approved</label>
                    <input
                        type="radio"
                        id="needs-changes"
                        checked={this.props.status === 'needs-changes'}
                        onChange={setStatusOnChange('needs-changes')}
                    />
                    <label htmlFor="needs-changes">Needs changes</label>

                    {statusErrors}
                </div>

                <div
                    className="reason"
                    data-error={this.props.errors.has('status-required')}
                >
                    <p>Please give a reason for this status</p>

                    <textarea
                        name="comment"
                        value={this.props.comment}
                        onChange={onChangeComment}
                    ></textarea>
                    <small>200 character limit.</small>

                    {reasonErrors}
                </div>

                <button className="btn" onClick={onSubmit}>
                    Submit Review
                </button>
            </div>
        );
    }

    render() {
        let toggleStatusBox = (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();

            this.props.store.dispatch(
                updateModerationState({
                    statusBoxOpen: !this.props.statusBoxOpen
                })
            );
        };

        let reviewButton = <></>;

        if (this.props.submitStage == 'not-submitted') {
            reviewButton = (
                <>
                    <span>Review</span>
                    <button className="btn" onClick={toggleStatusBox}>
                        +
                    </button>
                </>
            );
        } else if (this.props.submitStage == 'submitting') {
            reviewButton = (
                <>
                    <span>Submitting...</span>
                </>
            );
        } else if (this.props.submitStage == 'submitted') {
            reviewButton = (
                <>
                    <span>Submitted!</span>
                </>
            );
        } else if (this.props.submitStage == 'errored') {
            // TODO
            reviewButton = (
                <>
                    <span>Error</span>
                    <a href="#">Retry</a>
                </>
            );
        }

        return (
            <div className="moderation-bar">
                {this.renderModal()}

                <div className="moderation-bar__status">{reviewButton}</div>
            </div>
        );
    }
}
